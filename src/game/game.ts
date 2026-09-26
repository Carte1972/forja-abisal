import * as THREE from 'three';
import { initNavigation, Navigation } from '../engine/ai/navmesh';
import { AudioSystem } from '../engine/audio/audio_system';
import { EventBus } from '../engine/core/event_bus';
import { GameLoop } from '../engine/core/game_loop';
import { Rng } from '../engine/core/rng';
import { InputSystem } from '../engine/input/input_system';
import { buildLevel, type LoadedLevel } from '../engine/level/level_builder';
import { findSectorAt } from '../engine/level/level_queries';
import { parseLevel } from '../engine/level/level_parser';
import type { KeyColor, LevelData } from '../engine/level/level_types';
import { initPhysics, PhysicsWorld } from '../engine/physics/physics_world';
import { DecalSystem } from '../engine/render/decal_system';
import { LightSystem } from '../engine/render/light_system';
import { ParticleSystem } from '../engine/render/particle_system';
import { Renderer, type RenderQuality } from '../engine/render/renderer';
import { SkyDome } from '../engine/render/sky_dome';
import { ProceduralMaterials } from '../engine/textures/texture_library';
import { Automap } from '../hud/automap';
import { Crosshair } from '../hud/crosshair';
import { Hud } from '../hud/hud';
import { StatsPanel } from '../hud/stats_panel';
import { EnemySystem } from './enemies/enemy_system';
import { yawTowards } from './enemies/perception';
import type { GameEvents } from './game_events';
import { Player } from './player/player';
import { PlayerCombatant } from './player/player_combatant';
import { DamageRegistry } from './rules/damage';
import { LevelStats, type LevelSummary } from './rules/level_stats';
import {
  AMMO_TYPES,
  WEAPON_ORDER,
  WEAPONS,
  type AmmoType,
  type WeaponId,
} from './weapons/weapon_defs';
import { addAmmo, giveWeapon, type Loadout } from './weapons/weapon_logic';
import { WeaponSystem } from './weapons/weapon_system';
import type { Inventory } from './world/pickup_rules';
import { WorldSystem } from './world/world_system';

export type GameStatus = 'ready' | 'playing' | 'paused' | 'dead' | 'complete';

export interface GameCallbacks {
  onStatusChange(status: GameStatus): void;
  onLevelComplete?(summary: LevelSummary, carry: PlayerCarry): void;
}

/** Lo que el jugador se lleva de un nivel al siguiente. */
export interface PlayerCarry {
  health: number;
  armor: number;
  weapons: WeaponId[];
  /** Munición total por tipo (reserva más cargadores). */
  ammo: Partial<Record<AmmoType, number>>;
}

export interface GameSetup {
  /** Nivel en el formato JSON (se valida al cargar). */
  level: unknown;
  /** Estado del jugador al terminar el nivel anterior; sin él, se usa el inicio del nivel. */
  carry?: PlayerCarry;
}

/** Ajustes que el juego aplica en caliente (los guarda la interfaz). */
export interface GameSettings {
  mouseSensitivity: number;
  invertY: boolean;
  fov: number;
  volume: number;
  headBob: boolean;
  recoil: boolean;
  shadows: boolean;
  postProcessing: boolean;
  pixelate: boolean;
  resolutionScale: number;
  showFps: boolean;
}

const FIXED_STEP = 1 / 60;
/** Segundos de la caída de la cámara antes de mostrar la pantalla de muerte. */
const DEATH_DELAY = 1.6;
/** Tiempo mínimo entre quejidos del jugador al recibir daño. */
const PAIN_SOUND_INTERVAL = 0.35;
const DEFAULT_LOADOUT: Loadout = { weapons: ['pistol'], ammo: { bullets: 50 } };

/**
 * Inventario inicial desde las propiedades del `player_start` del nivel
 * (`"weapons": ["pistol", ...]` y `"ammo": { "bullets": 50, ... }`).
 */
function loadoutFrom(level: LevelData): Loadout {
  const props = level.things.find((thing) => thing.type === 'player_start')?.properties ?? {};
  const weapons = Array.isArray(props.weapons)
    ? props.weapons.filter((id): id is WeaponId => WEAPON_ORDER.includes(id as WeaponId))
    : DEFAULT_LOADOUT.weapons;
  const ammo: Partial<Record<AmmoType, number>> = {};
  const rawAmmo = props.ammo;
  if (rawAmmo && typeof rawAmmo === 'object') {
    for (const type of AMMO_TYPES) {
      const amount = (rawAmmo as Record<string, unknown>)[type];
      if (typeof amount === 'number') ammo[type] = amount;
    }
  }
  return props.weapons === undefined ? DEFAULT_LOADOUT : { weapons, ammo };
}

/** Orquesta motor y juego: crea los sistemas, ejecuta el bucle y expone el estado a la UI. */
export class Game {
  private readonly renderer: Renderer;
  private readonly physics: PhysicsWorld;
  private readonly input: InputSystem;
  private readonly bus = new EventBus<GameEvents>();
  private readonly rng = new Rng(20260926);
  private readonly materials: ProceduralMaterials;
  private readonly lights = new LightSystem();
  private readonly particles: ParticleSystem;
  private readonly decals = new DecalSystem();
  private readonly damage = new DamageRegistry();
  private readonly sky: SkyDome | null;
  private readonly hudRoot: HTMLDivElement;
  private readonly statsPanel: StatsPanel;
  private readonly crosshair: Crosshair;
  private readonly hud: Hud;
  private readonly automap: Automap;
  private readonly audio: AudioSystem;
  private lastPainSound = -Infinity;
  readonly level: LoadedLevel;
  private readonly navigation: Navigation | null;
  private readonly player: Player;
  private readonly playerCombatant: PlayerCombatant;
  private readonly keys = new Set<KeyColor>();
  private readonly weapons: WeaponSystem;
  private readonly enemies: EnemySystem;
  private readonly world: WorldSystem;
  private stats = new LevelStats(0, 0, 0);
  private deathTimer = 0;
  private readonly unsubscribers: (() => void)[] = [];
  private readonly loop: GameLoop;
  private readonly options = { headBob: true, recoil: true, mouseSensitivity: 1, invertY: false };
  private status: GameStatus = 'ready';
  private time = 0;
  private readonly unsubscribeLock: () => void;

  static async create(
    container: HTMLElement,
    callbacks: GameCallbacks,
    setup: GameSetup,
  ): Promise<Game> {
    await Promise.all([initPhysics(), initNavigation()]);
    return new Game(container, callbacks, setup);
  }

  private constructor(
    container: HTMLElement,
    private readonly callbacks: GameCallbacks,
    setup: GameSetup,
  ) {
    this.renderer = new Renderer(container);
    this.physics = new PhysicsWorld(FIXED_STEP);
    this.input = new InputSystem(this.renderer.canvas);
    this.materials = new ProceduralMaterials(Math.min(this.renderer.maxAnisotropy, 8));
    this.level = buildLevel(
      parseLevel(setup.level),
      this.renderer.scene,
      this.physics,
      this.materials,
    );
    this.sky = this.setupEnvironment();
    this.particles = new ParticleSystem(this.rng);
    this.renderer.scene.add(this.particles.group, this.decals.group);

    this.hudRoot = document.createElement('div');
    this.hudRoot.className = 'hud-root';
    container.appendChild(this.hudRoot);
    this.hud = new Hud(this.hudRoot);
    this.crosshair = new Crosshair(this.hudRoot);
    this.statsPanel = new StatsPanel(this.hudRoot);
    this.automap = new Automap(this.hudRoot, this.level.data);
    this.audio = new AudioSystem(this.renderer.camera, this.renderer.scene);
    this.audio.startAmbient();

    this.navigation = this.buildNavigation();
    this.player = new Player(this.physics, this.level.spawn, this.options);
    this.playerCombatant = new PlayerCombatant(this.player, this.bus);
    this.damage.registerPlayer(this.playerCombatant.colliderHandle, this.playerCombatant);
    this.weapons = new WeaponSystem(
      {
        physics: this.physics,
        camera: this.renderer.camera,
        viewmodelScene: this.renderer.viewmodelScene,
        scene: this.renderer.scene,
        lights: this.lights,
        particles: this.particles,
        decals: this.decals,
        damage: this.damage,
        bus: this.bus,
        player: this.player,
        level: this.level,
        rng: this.rng,
        onShot: (def) => this.crosshair.pulse(def.recoil * 8),
      },
      setup.carry
        ? { weapons: setup.carry.weapons.filter((id) => id !== 'hammer'), ammo: setup.carry.ammo }
        : loadoutFrom(this.level.data),
    );
    if (setup.carry) {
      this.playerCombatant.health.health = setup.carry.health;
      this.playerCombatant.health.armor = setup.carry.armor;
    }

    // El mundo se crea antes que los enemigos para que estos puedan abrir puertas.
    const enemyFeet = () => this.enemies.enemies.filter((e) => e.alive).map((e) => e.feet);
    this.world = new WorldSystem({
      physics: this.physics,
      scene: this.renderer.scene,
      level: this.level,
      bus: this.bus,
      player: this.player,
      playerCombatant: this.playerCombatant,
      inventory: this.createInventory(),
      enemyFeet,
    });
    this.enemies = new EnemySystem({
      physics: this.physics,
      navigation: this.navigation,
      scene: this.renderer.scene,
      particles: this.particles,
      lights: this.lights,
      decals: this.decals,
      damage: this.damage,
      bus: this.bus,
      rng: this.rng,
      level: this.level,
      player: this.playerCombatant,
      openDoorAt: (point) => this.world.openDoorForEnemy(point),
    });
    this.enemies.spawnFromLevel();
    this.stats = new LevelStats(
      this.enemies.enemies.length,
      this.world.totalItems,
      this.world.totalSecrets,
    );

    this.unsubscribers.push(
      this.bus.on('playerDamaged', ({ amount, from }) => this.onPlayerDamaged(amount, from)),
      this.bus.on('playerDied', () => {
        this.player.die();
        this.weapons.setVisible(false);
        if (this.automap.isVisible) this.automap.toggle();
        this.deathTimer = DEATH_DELAY;
        this.audio.play('player_death');
      }),
      this.bus.on('sound', ({ id, position, volume, pitch }) =>
        this.audio.play(id, { ...(position ? { position } : {}), volume, pitch }),
      ),
      this.bus.on('enemyKilled', () => this.stats.kills++),
      this.bus.on('secretFound', () => this.stats.secrets++),
      this.bus.on('pickup', ({ name, color, weapon }) => {
        this.stats.items++;
        this.hud.pickup(color);
        this.hud.message(`Has recogido: ${name}`);
        if (weapon) this.weapons.select(weapon);
      }),
      this.bus.on('message', ({ text, color }) => this.hud.message(text, color)),
      this.bus.on('levelComplete', () => this.completeLevel()),
    );

    this.unsubscribeLock = this.input.onPointerLockChanged((locked) => {
      if (this.status !== 'complete' && this.status !== 'dead') {
        this.setStatus(locked ? 'playing' : 'paused');
      }
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
    // El mismo clic desbloquea el audio del navegador.
    this.audio.resume();
    return this.input.requestPointerLock();
  }

  setQuality(quality: RenderQuality): void {
    this.renderer.setQuality(quality);
    this.lights.setShadowsEnabled(quality.shadows);
  }

  /** Aplica los ajustes de la interfaz: controles, cámara, sonido y calidad gráfica. */
  applySettings(settings: GameSettings): void {
    Object.assign(this.options, {
      headBob: settings.headBob,
      recoil: settings.recoil,
      mouseSensitivity: settings.mouseSensitivity,
      invertY: settings.invertY,
    });
    const camera = this.renderer.camera;
    camera.fov = settings.fov;
    camera.updateProjectionMatrix();
    this.audio.setVolume(settings.volume);
    this.statsPanel.setVisible(settings.showFps);
    this.setQuality({
      postProcessing: settings.postProcessing,
      bloom: settings.postProcessing,
      vignette: settings.postProcessing,
      pixelate: settings.pixelate,
      shadows: settings.shadows,
      resolutionScale: settings.resolutionScale,
    });
  }

  /** Entra o sale del modo juego sin pointer lock real (solo para pruebas automatizadas). */
  debugSetPlaying(playing: boolean): void {
    this.input.simulatePointerLock(playing);
  }

  /** Estado del jugador para depuración y pruebas automatizadas. */
  debugState() {
    const feet = this.player.body.feetPosition;
    const weapons = this.weapons.state;
    return {
      status: this.status,
      feet: { x: feet.x, y: feet.y, z: feet.z },
      velocity: { ...this.player.movement.velocity },
      grounded: this.player.movement.grounded,
      crouched: this.player.body.crouched,
      yaw: this.player.yaw,
      pitch: this.player.pitch,
      weapon: weapons.current,
      weaponPhase: weapons.phase,
      magazine: weapons.magazines[weapons.current],
      ammo: { ...weapons.ammo },
      owned: [...weapons.owned],
      projectiles: this.weapons.projectiles.count,
      health: this.playerCombatant.health.health,
      armor: this.playerCombatant.health.armor,
      keys: [...this.keys],
      dead: this.player.dead,
      stats: this.stats.summary(),
      movers: this.level.movers.map((m) => `${m.kind}:${m.progress.toFixed(2)}`),
      enemies: this.enemies.enemies.map((e) => ({
        kind: e.def.kind,
        state: e.memory.state,
        health: Math.round(e.health),
        feet: e.feet,
        target: e.target === this.playerCombatant ? 'player' : 'enemy',
      })),
      particles: this.particles.activeCount,
    };
  }

  dispose(): void {
    this.loop.stop();
    this.unsubscribeLock();
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.bus.clear();
    this.input.dispose();
    this.world.dispose();
    this.audio.dispose();
    this.automap.dispose();
    this.enemies.dispose();
    this.navigation?.dispose();
    this.weapons.dispose();
    this.player.dispose();
    this.level.dispose();
    this.materials.dispose();
    this.lights.dispose();
    this.particles.dispose();
    this.decals.dispose();
    this.sky?.dispose();
    this.statsPanel.dispose();
    this.crosshair.dispose();
    this.hud.dispose();
    this.hudRoot.remove();
    this.physics.dispose();
    this.renderer.dispose();
  }

  /** Inventario que ven los objetos: salud y blindaje del jugador, llaves y armas. */
  private createInventory(): Inventory {
    const health = () => this.playerCombatant.health;
    const weapons = () => this.weapons.state;
    return {
      get health() {
        return health().health;
      },
      set health(value: number) {
        health().health = value;
      },
      get armor() {
        return health().armor;
      },
      set armor(value: number) {
        health().armor = value;
      },
      keys: this.keys,
      hasWeapon: (weapon) => weapons().owned.has(weapon),
      addAmmo: (ammo, amount) => addAmmo(weapons(), ammo, amount),
      giveWeapon: (weapon) => giveWeapon(weapons(), weapon),
    };
  }

  private fixedUpdate(dt: number): void {
    if (this.status !== 'playing') return;
    this.stats.time += dt;
    // El mundo va primero: mueve puertas y ascensores y lleva al jugador con la plataforma.
    this.world.fixedUpdate(dt);
    this.player.fixedUpdate(this.input, dt);
    if (this.player.dead) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        this.setStatus('dead');
        this.input.exitPointerLock();
      }
    } else {
      if (this.input.consumePressed('use')) this.use();
      if (this.input.consumePressed('automap')) this.automap.toggle();
      this.weapons.fixedUpdate(dt, this.input, true);
      const feet = this.player.body.feetPosition;
      const sector = findSectorAt(this.level.data, feet.x, feet.z);
      if (sector) this.automap.reveal(sector.index);
    }
    this.enemies.fixedUpdate(dt);
    this.physics.step((h1, h2) => this.weapons.handleCollision(h1, h2));
  }

  private use(): void {
    const camera = this.renderer.camera;
    camera.updateMatrixWorld();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const eye = camera.position;
    this.world.use({ x: eye.x, y: eye.y, z: eye.z }, { x: forward.x, y: forward.y, z: forward.z });
  }

  private render(alpha: number, frameDt: number): void {
    let lookX = 0;
    let lookY = 0;
    if (this.status === 'playing') {
      const look = this.input.consumeMouseDelta();
      lookX = look.x;
      lookY = look.y;
      this.player.applyLook(look.x, look.y);
      if (this.input.consumePressed('stats')) this.statsPanel.toggle();
    }
    this.audio.update();
    const dt = Math.min(frameDt, 0.1);
    // El tiempo de las animaciones visuales (lava, parpadeos, nubes) sigue corriendo en pausa.
    this.time += dt;
    const camera = this.renderer.camera;
    this.player.updateCamera(camera, this.status === 'playing' ? alpha : 1);
    this.materials.update(this.time);
    this.lights.update(this.time, camera.position);
    this.sky?.update(this.time, camera);
    this.world.render(dt);
    if (this.status === 'playing') {
      this.weapons.frameUpdate(dt, lookX, lookY, this.options.headBob);
      this.particles.update(dt, camera, this.renderer.bufferHeight);
      this.enemies.render(alpha, dt);
    }
    this.updateHud(dt);
    this.automap.draw(
      this.time,
      { x: camera.position.x, z: camera.position.z, yaw: this.player.yaw },
      this.world.markers(),
    );
    this.renderer.render(frameDt);
    this.statsPanel.update(frameDt, this.renderer.stats(), {
      lámparas: this.level.lamps.length,
      enemigos: `${this.enemies.aliveCount}/${this.enemies.enemies.length}`,
      partículas: this.particles.activeCount,
    });
  }

  private updateHud(dt: number): void {
    const state = this.weapons.state;
    const def = WEAPONS[state.current];
    this.crosshair.update(
      dt,
      def.primary.spread,
      this.renderer.camera.fov,
      this.renderer.canvas.clientHeight,
      def.primary.kind === 'melee',
    );
    this.crosshair.setVisible(!this.player.dead && this.status !== 'complete');
    this.hud.setVisible(this.status !== 'complete');
    this.hud.update(dt, {
      health: this.playerCombatant.health.health,
      armor: this.playerCombatant.health.armor,
      weaponName: def.name,
      magazine: def.ammo ? state.magazines[state.current] : null,
      reserve: def.ammo ? state.ammo[def.ammo] : null,
      reloading: state.phase === 'reloading',
      keys: this.keys,
      owned: WEAPON_ORDER.map((id) => state.owned.has(id)),
      currentSlot: def.slot,
      dead: this.player.dead,
    });
  }

  private onPlayerDamaged(amount: number, from: { x: number; y: number; z: number }): void {
    if (this.playerCombatant.alive && this.time - this.lastPainSound > PAIN_SOUND_INTERVAL) {
      this.lastPainSound = this.time;
      this.audio.play('player_pain', { pitch: 0.9 + Math.random() * 0.2 });
    }
    const center = this.player.center();
    const horizontal = Math.hypot(from.x - center.x, from.z - center.z);
    if (horizontal < 0.3) {
      this.hud.damage(amount, null);
      return;
    }
    const relative = yawTowards(center, from) - this.player.yaw;
    this.hud.damage(amount, Math.atan2(Math.sin(relative), Math.cos(relative)));
  }

  private completeLevel(): void {
    if (this.status === 'complete') return;
    this.setStatus('complete');
    this.input.exitPointerLock();
    this.callbacks.onLevelComplete?.(this.stats.summary(), this.carry());
  }

  /** Estado del jugador para empezar el siguiente nivel. */
  private carry(): PlayerCarry {
    const state = this.weapons.state;
    const ammo: Partial<Record<AmmoType, number>> = { ...state.ammo };
    for (const id of state.owned) {
      const type = WEAPONS[id].ammo;
      if (type) ammo[type] = (ammo[type] ?? 0) + state.magazines[id];
    }
    const health = this.playerCombatant.health;
    return {
      health: Math.max(1, health.health),
      armor: health.armor,
      weapons: [...state.owned],
      ammo,
    };
  }

  private buildNavigation(): Navigation | null {
    try {
      const { positions, indices } = this.level.collision;
      return Navigation.build(positions, indices);
    } catch (error) {
      // Sin malla de navegación los enemigos van en línea recta hacia su objetivo.
      console.warn('No se pudo generar la malla de navegación', error);
      return null;
    }
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
