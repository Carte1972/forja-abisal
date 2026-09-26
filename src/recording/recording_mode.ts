import { Rng } from '../engine/core/rng';
import { thingHeight } from '../engine/level/level_builder';
import type { Enemy } from '../game/enemies/enemy';
import { ENEMIES } from '../game/enemies/enemy_defs';
import { Game, type GameSettings, type PlayerCarry, type RecordingAccess } from '../game/game';
import { LEVELS } from '../levels/index';
import { buildTimeline, frameCount, TimelineCursor } from './action_timeline';
import {
  blendAngles,
  lookAngles,
  sampleCameraPath,
  validateCameraPath,
  windowWeight,
} from './camera_path';
import type { ClipAction, ClipDefinition } from './clip_types';

/**
 * Modo de grabación de vídeo (`?grabar=<clip>`, solo en desarrollo). Carga el clip de
 * `video/clips/`, prepara el nivel y expone `window.__grabacion` para que el script
 * `video/scripts/grab_clips.ts` avance el juego fotograma a fotograma y capture cada uno.
 *
 * Todo es determinista: un paso de simulación de 1/60 s por fotograma, sin reloj real, con el
 * azar del juego sembrado y `Math.random` sustituido por un generador con semilla.
 */

export const RECORDING_FPS = 60;

/** Interfaz que usa el script de captura desde Playwright. */
export interface RecordingControl {
  clip: string;
  frames: number;
  /** Avanza un fotograma (simulación y dibujo). */
  step(): void;
  /** Dibuja el fotograma actual sin avanzar (para comprobaciones). */
  redraw(): void;
  /** Avanza sin grabar hasta el fotograma `frame` (vistas previas). */
  seek(frame: number): void;
  /** Estado del jugador y de los enemigos, para ajustar clips. */
  debug(): ReturnType<Game['debugState']>;
}

declare global {
  interface Window {
    __grabacion?: RecordingControl;
    __grabacionError?: string;
  }
}

const CLIPS = import.meta.glob<{ default: ClipDefinition }>('../../video/clips/*.ts');

const SETTINGS: GameSettings = {
  mouseSensitivity: 1,
  invertY: false,
  fov: 75,
  volume: 0,
  headBob: true,
  recoil: true,
  shadows: true,
  postProcessing: true,
  pixelate: false,
  resolutionScale: 1,
  showFps: false,
};

/** Fotogramas que se dibujan antes de empezar, para que se compilen los shaders. */
const WARMUP_DRAWS = 3;
const DEG = Math.PI / 180;
/** Altura de los ojos del jugador de pie (la de `Player`). */
const EYE_HEIGHT = 1.62;
/** Segundos de transición al empezar o dejar de apuntar a un enemigo. */
const AIM_RAMP = 0.2;

export async function startRecording(clipId: string, root: HTMLElement): Promise<void> {
  try {
    const loader = CLIPS[`../../video/clips/${clipId}.ts`];
    if (!loader) throw new Error(`No existe el clip "${clipId}" en video/clips/.`);
    const clip = (await loader()).default;
    const errors = validateClip(clip, clipId);
    if (errors.length > 0) throw new Error(`Clip "${clipId}" no válido:\n${errors.join('\n')}`);

    seedMathRandom(clip.seed ?? 1);
    document.body.classList.add('recording');
    if (!clip.hud) document.body.classList.add('recording-no-hud');
    root.className = 'game-root';
    const container = document.createElement('div');
    container.className = 'game-container';
    root.appendChild(container);

    const level = LEVELS.find((entry) => entry.id === clip.level);
    if (!level) throw new Error(`Nivel desconocido: ${clip.level}`);
    const game = await Game.create(
      container,
      { onStatusChange: () => {} },
      {
        level: level.data,
        carry: carryFor(clip),
        recording: { levelEnemies: clip.levelEnemies ?? true },
      },
    );
    game.applySettings({ ...SETTINGS, fov: clip.fov ?? SETTINGS.fov });
    game.debugSetPlaying(true);
    const director = new ClipDirector(game, clip);
    window.__grabacion = {
      clip: clip.id,
      frames: director.frames,
      step: () => director.step(),
      redraw: () => game.recordingStep(false),
      seek: (frame) => director.seek(frame),
      debug: () => game.debugState(),
    };
  } catch (error) {
    window.__grabacionError = error instanceof Error ? error.message : String(error);
    console.error(error);
  }
}

/** Ejecuta un clip paso a paso: cámara, acciones y simulación. */
class ClipDirector {
  readonly frames: number;
  private frame = 0;
  private readonly access: RecordingAccess;
  private readonly cursor: TimelineCursor<ClipAction>;
  private readonly named = new Map<string, Enemy>();

  constructor(
    private readonly game: Game,
    private readonly clip: ClipDefinition,
  ) {
    this.access = game.recordingAccess();
    this.frames = frameCount(clip.duration, RECORDING_FPS);
    this.cursor = new TimelineCursor(buildTimeline(clip.actions ?? [], RECORDING_FPS));

    const { camera } = clip;
    if (camera.mode === 'player') {
      const [x, z] = camera.start.pos;
      this.access.player.body.teleport({ x, y: camera.start.y ?? this.floorAt(x, z), z });
      this.access.player.yaw = camera.start.yaw * DEG;
      this.access.player.pitch = (camera.start.pitch ?? 0) * DEG;
    } else {
      if (camera.playerAt) {
        const [x, z] = camera.playerAt;
        this.access.player.body.teleport({ x, y: this.floorAt(x, z), z });
      }
      game.cameraOverride = (cam) => {
        const sample = sampleCameraPath(camera.path, this.time);
        cam.position.set(sample.pos!.x, sample.pos!.y, sample.pos!.z);
        cam.rotation.set(sample.pitch, sample.yaw, 0);
      };
    }
    if (clip.loadout?.weapon) this.access.weapons.select(clip.loadout.weapon);
    for (const key of clip.loadout?.keys ?? []) this.access.keys.add(key);
    this.access.weapons.setVisible(clip.viewmodel ?? camera.mode === 'player');

    // Precalentamiento: simula sin grabar y dibuja unas veces para compilar los shaders.
    const warmupSteps = Math.round((clip.warmup ?? 0.5) * RECORDING_FPS);
    for (let i = 0; i < warmupSteps; i++) {
      this.aimCamera();
      game.recordingStep(true);
    }
    for (let i = 0; i < WARMUP_DRAWS; i++) game.recordingStep(false);
  }

  /** Segundos del clip en el fotograma actual. */
  private get time(): number {
    return this.frame / RECORDING_FPS;
  }

  step(): void {
    for (const event of this.cursor.take(this.frame)) this.apply(event.action, event.phase);
    this.aimCamera();
    this.game.recordingStep(true);
    this.frame++;
  }

  seek(frame: number): void {
    while (this.frame < frame) this.step();
  }

  /** Orienta al jugador o lleva su cuerpo con la cámara libre, antes de simular el paso. */
  private aimCamera(): void {
    const { camera } = this.clip;
    const player = this.access.player;
    if (camera.mode === 'player') {
      const feet = player.body.feetPosition;
      const eye = { x: feet.x, y: feet.y + EYE_HEIGHT, z: feet.z };
      let view = camera.look
        ? sampleCameraPath(camera.look, this.time, eye)
        : { yaw: camera.start.yaw * DEG, pitch: (camera.start.pitch ?? 0) * DEG };
      for (const aim of camera.aim ?? []) {
        const weight = windowWeight(this.time, aim.from, aim.to, AIM_RAMP);
        const enemy = this.named.get(aim.enemy);
        if (weight > 0 && enemy) view = blendAngles(view, lookAngles(eye, enemy.center()), weight);
      }
      player.yaw = view.yaw;
      player.pitch = view.pitch;
    } else if (camera.playerFollows) {
      const sample = sampleCameraPath(camera.path, this.time);
      const pos = sample.pos!;
      player.body.teleport({ x: pos.x, y: pos.y - EYE_HEIGHT, z: pos.z });
      player.movement.velocity = { x: 0, y: 0, z: 0 };
      player.yaw = sample.yaw;
    }
  }

  private apply(action: ClipAction, phase: 'start' | 'end'): void {
    switch (action.do) {
      case 'input':
        this.access.input.simulateAction(action.input, phase === 'start');
        return;
      case 'spawn': {
        if (phase !== 'start') return;
        const def = ENEMIES[action.kind];
        const [x, z] = action.pos;
        const floor = action.y ?? this.floorAt(x, z);
        const enemy = this.access.enemies.spawn(def, {
          position: { x, y: floor + (action.y === undefined ? (def.hover ?? 0) : 0), z },
          yaw: (action.yaw ?? 0) * DEG,
          patrol: [
            ...(action.patrol && action.patrol.length > 0 ? [{ x, y: floor, z }] : []),
            ...(action.patrol ?? []).map(([px, pz]) => ({ x: px, y: floor, z: pz })),
          ],
        });
        this.named.set(action.name, enemy);
        return;
      }
      case 'provoke': {
        if (phase !== 'start') return;
        const attacker = this.enemy(action.attacker);
        const victim = this.enemy(action.victim);
        victim.applyDamage({
          amount: 1,
          point: victim.center(),
          direction: { x: 0, y: 0, z: 0 },
          knockback: 0,
          source: 'enemy',
          attacker,
        });
        return;
      }
    }
  }

  private enemy(name: string): Enemy {
    const enemy = this.named.get(name);
    if (!enemy) throw new Error(`No hay ningún enemigo llamado "${name}" en el clip.`);
    return enemy;
  }

  private floorAt(x: number, z: number): number {
    return thingHeight(this.access.level.data, {
      type: 'recording',
      position: [x, z],
      angle: 0,
      properties: {},
    });
  }
}

function validateClip(clip: ClipDefinition, fileId: string): string[] {
  const errors: string[] = [];
  if (clip.id !== fileId) errors.push(`El id "${clip.id}" no coincide con el archivo "${fileId}".`);
  if (!(clip.duration > 0)) errors.push('La duración debe ser mayor que 0.');
  if (clip.camera.mode === 'free') {
    errors.push(...validateCameraPath(clip.camera.path, true));
  } else if (clip.camera.look) {
    errors.push(...validateCameraPath(clip.camera.look, false));
  }
  const names = new Set<string>();
  for (const action of clip.actions ?? []) if (action.do === 'spawn') names.add(action.name);
  if (clip.camera.mode === 'player') {
    for (const aim of clip.camera.aim ?? []) {
      if (!names.has(aim.enemy)) errors.push(`aim: "${aim.enemy}" no se crea con spawn.`);
    }
  }
  names.clear();
  for (const action of clip.actions ?? []) {
    if (action.do === 'spawn') names.add(action.name);
    if (action.do === 'provoke') {
      for (const name of [action.attacker, action.victim]) {
        if (!names.has(name)) errors.push(`provoke: "${name}" no se ha creado antes con spawn.`);
      }
    }
  }
  return errors;
}

/** Armas y munición del clip, con la salud llena. */
function carryFor(clip: ClipDefinition): PlayerCarry | undefined {
  if (!clip.loadout) return undefined;
  return { health: 100, armor: 0, weapons: clip.loadout.weapons, ammo: clip.loadout.ammo ?? {} };
}

/** Sustituye `Math.random` (azar cosmético del HUD y las partículas) por un generador con semilla. */
function seedMathRandom(seed: number): void {
  const rng = new Rng(seed);
  Math.random = () => rng.next();
}
