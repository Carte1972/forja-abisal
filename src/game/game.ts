import * as THREE from 'three';
import { GameLoop } from '../engine/core/game_loop';
import { InputSystem } from '../engine/input/input_system';
import { buildLevel, type LoadedLevel } from '../engine/level/level_builder';
import { parseLevel } from '../engine/level/level_parser';
import { initPhysics, PhysicsWorld } from '../engine/physics/physics_world';
import { LightSystem } from '../engine/render/light_system';
import { Renderer, type RenderQuality } from '../engine/render/renderer';
import { SkyDome } from '../engine/render/sky_dome';
import { ProceduralMaterials } from '../engine/textures/texture_library';
import { StatsPanel } from '../hud/stats_panel';
import testLevel from '../levels/test_level.json';
import { Player } from './player/player';

export type GameStatus = 'ready' | 'playing' | 'paused';

export interface GameCallbacks {
  onStatusChange(status: GameStatus): void;
}

const FIXED_STEP = 1 / 60;

/** Orquesta motor y juego: crea los sistemas, ejecuta el bucle y expone el estado a la UI. */
export class Game {
  private readonly renderer: Renderer;
  private readonly physics: PhysicsWorld;
  private readonly input: InputSystem;
  private readonly materials: ProceduralMaterials;
  private readonly lights = new LightSystem();
  private readonly sky: SkyDome | null;
  private readonly hudRoot: HTMLDivElement;
  private readonly statsPanel: StatsPanel;
  readonly level: LoadedLevel;
  private readonly player: Player;
  private readonly loop: GameLoop;
  private status: GameStatus = 'ready';
  private time = 0;
  private readonly unsubscribeLock: () => void;

  static async create(container: HTMLElement, callbacks: GameCallbacks): Promise<Game> {
    await initPhysics();
    return new Game(container, callbacks);
  }

  private constructor(
    container: HTMLElement,
    private readonly callbacks: GameCallbacks,
  ) {
    this.renderer = new Renderer(container);
    this.physics = new PhysicsWorld(FIXED_STEP);
    this.input = new InputSystem(this.renderer.canvas);
    this.materials = new ProceduralMaterials(Math.min(this.renderer.maxAnisotropy, 8));
    this.level = buildLevel(
      parseLevel(testLevel),
      this.renderer.scene,
      this.physics,
      this.materials,
    );
    this.sky = this.setupEnvironment();

    this.hudRoot = document.createElement('div');
    this.hudRoot.className = 'hud-root';
    container.appendChild(this.hudRoot);
    this.statsPanel = new StatsPanel(this.hudRoot);
    this.player = new Player(this.physics, this.level.spawn, { headBob: true });

    this.unsubscribeLock = this.input.onPointerLockChanged((locked) => {
      this.setStatus(locked ? 'playing' : 'paused');
    });

    this.loop = new GameLoop(
      {
        fixedUpdate: (dt) => this.fixedUpdate(dt),
        render: (alpha, frameDt) => this.render(alpha, frameDt),
      },
      FIXED_STEP,
    );
    this.loop.start();
    callbacks.onStatusChange(this.status);
  }

  /** Debe llamarse desde un gesto del usuario (clic) para que el navegador conceda el pointer lock. */
  requestPlay(): Promise<void> {
    return this.input.requestPointerLock();
  }

  setQuality(quality: RenderQuality): void {
    this.renderer.setQuality(quality);
    this.lights.setShadowsEnabled(quality.shadows);
  }

  /** Entra o sale del modo juego sin pointer lock real (solo para pruebas automatizadas). */
  debugSetPlaying(playing: boolean): void {
    this.input.simulatePointerLock(playing);
  }

  /** Estado del jugador para depuración y pruebas automatizadas. */
  debugState() {
    const feet = this.player.body.feetPosition;
    return {
      status: this.status,
      feet: { x: feet.x, y: feet.y, z: feet.z },
      velocity: { ...this.player.movement.velocity },
      grounded: this.player.movement.grounded,
      crouched: this.player.body.crouched,
      yaw: this.player.yaw,
      pitch: this.player.pitch,
    };
  }

  dispose(): void {
    this.loop.stop();
    this.unsubscribeLock();
    this.input.dispose();
    this.player.dispose();
    this.level.dispose();
    this.materials.dispose();
    this.lights.dispose();
    this.sky?.dispose();
    this.statsPanel.dispose();
    this.hudRoot.remove();
    this.physics.dispose();
    this.renderer.dispose();
  }

  private fixedUpdate(dt: number): void {
    if (this.status !== 'playing') return;
    this.player.fixedUpdate(this.input, dt);
    this.physics.step();
  }

  private render(alpha: number, frameDt: number): void {
    if (this.status === 'playing') {
      const look = this.input.consumeMouseDelta();
      this.player.applyLook(look.x, look.y);
      if (this.input.consumePressed('stats')) this.statsPanel.toggle();
    }
    // El tiempo de las animaciones visuales (lava, parpadeos, nubes) sigue corriendo en pausa.
    this.time += Math.min(frameDt, 0.1);
    const camera = this.renderer.camera;
    this.player.updateCamera(camera, this.status === 'playing' ? alpha : 1);
    this.materials.update(this.time);
    this.lights.update(this.time, camera.position);
    this.sky?.update(this.time, camera);
    this.renderer.render(frameDt);
    this.statsPanel.update(frameDt, this.renderer.stats(), {
      lámparas: this.level.lamps.length,
    });
  }

  /** Niebla, cielo, luz ambiental y lámparas según el entorno del nivel. */
  private setupEnvironment(): SkyDome | null {
    const { environment } = this.level.data;
    const scene = this.renderer.scene;
    scene.fog = new THREE.Fog(environment.fog.color, environment.fog.near, environment.fog.far);
    scene.background = new THREE.Color(environment.fog.color);
    this.lights.setAmbient(environment.ambient.color, environment.ambient.intensity);
    this.lights.setLamps(this.level.lamps);
    scene.add(this.lights.group);
    if (!this.level.data.sectors.some((sector) => sector.sky)) return null;
    this.lights.setSun(environment.sun, this.level.bounds);
    const sky = new SkyDome(environment.sky);
    scene.add(sky.mesh);
    return sky;
  }

  private setStatus(status: GameStatus): void {
    if (status === this.status) return;
    this.status = status;
    this.callbacks.onStatusChange(status);
  }
}
