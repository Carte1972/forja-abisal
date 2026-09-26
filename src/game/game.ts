import * as THREE from 'three';
import { initNavigation, Navigation } from '../engine/ai/navmesh';
import { EventBus } from '../engine/core/event_bus';
import { GameLoop } from '../engine/core/game_loop';
import { Rng } from '../engine/core/rng';
import { InputSystem } from '../engine/input/input_system';
import { buildLevel, type LoadedLevel } from '../engine/level/level_builder';
import { parseLevel } from '../engine/level/level_parser';
import type { LevelData } from '../engine/level/level_types';
import { initPhysics, PhysicsWorld } from '../engine/physics/physics_world';
import { DecalSystem } from '../engine/render/decal_system';
import { LightSystem } from '../engine/render/light_system';
import { ParticleSystem } from '../engine/render/particle_system';
import { Renderer, type RenderQuality } from '../engine/render/renderer';
import { SkyDome } from '../engine/render/sky_dome';
import { ProceduralMaterials } from '../engine/textures/texture_library';
import { Crosshair } from '../hud/crosshair';
import { DamageFlash } from '../hud/damage_flash';
import { StatsPanel } from '../hud/stats_panel';
import { WeaponReadout } from '../hud/weapon_readout';
import testLevel from '../levels/test_level.json';
import { EnemySystem } from './enemies/enemy_system';
import type { GameEvents } from './game_events';
import { Player } from './player/player';
import { PlayerCombatant } from './player/player_combatant';
import { DamageRegistry } from './rules/damage';
import {
  AMMO_TYPES,
  WEAPON_ORDER,
  WEAPONS,
  type AmmoType,
  type WeaponId,
} from './weapons/weapon_defs';
import type { Loadout } from './weapons/weapon_logic';
import { WeaponSystem } from './weapons/weapon_system';

export type GameStatus = 'ready' | 'playing' | 'paused';

export interface GameCallbacks {
  onStatusChange(status: GameStatus): void;
}

export interface GameplayOptions {
  headBob: boolean;
  recoil: boolean;
}

const FIXED_STEP = 1 / 60;
/** Segundos tras morir antes de reaparecer (la pantalla de muerte llega en la fase 8). */
const RESPAWN_DELAY = 2.5;
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
  private readonly readout: WeaponReadout;
  private readonly damageFlash: DamageFlash;
  readonly level: LoadedLevel;
  private readonly navigation: Navigation | null;
  private readonly player: Player;
  private readonly playerCombatant: PlayerCombatant;
  private readonly weapons: WeaponSystem;
  private readonly enemies: EnemySystem;
  private respawnTimer = 0;
  private readonly unsubscribers: (() => void)[] = [];
  private readonly loop: GameLoop;
  private readonly options: GameplayOptions = { headBob: true, recoil: true };
  private status: GameStatus = 'ready';
  private time = 0;
  private readonly unsubscribeLock: () => void;

  static async create(container: HTMLElement, callbacks: GameCallbacks): Promise<Game> {
    await Promise.all([initPhysics(), initNavigation()]);
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
    this.particles = new ParticleSystem(this.rng);
    this.renderer.scene.add(this.particles.group, this.decals.group);

    this.hudRoot = document.createElement('div');
    this.hudRoot.className = 'hud-root';
    container.appendChild(this.hudRoot);
    this.statsPanel = new StatsPanel(this.hudRoot);
    this.crosshair = new Crosshair(this.hudRoot);
    this.readout = new WeaponReadout(this.hudRoot);
    this.damageFlash = new DamageFlash(this.hudRoot);

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
      loadoutFrom(this.level.data),
    );
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
    });
    this.enemies.spawnFromLevel();
    this.unsubscribers.push(
      this.bus.on('playerDamaged', ({ amount }) => this.damageFlash.hit(amount)),
      this.bus.on('playerDied', () => {
        this.player.die();
        this.weapons.setVisible(false);
        this.respawnTimer = RESPAWN_DELAY;
      }),
    );

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

  setGameplayOptions(options: Partial<GameplayOptions>): void {
    Object.assign(this.options, options);
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
      projectiles: this.weapons.projectiles.count,
      health: this.playerCombatant.health.health,
      dead: this.player.dead,
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
    this.readout.dispose();
    this.damageFlash.dispose();
    this.hudRoot.remove();
    this.physics.dispose();
    this.renderer.dispose();
  }

  private fixedUpdate(dt: number): void {
    if (this.status !== 'playing') return;
    this.player.fixedUpdate(this.input, dt);
    if (this.player.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawnPlayer();
    } else {
      this.weapons.fixedUpdate(dt, this.input, true);
    }
    this.enemies.fixedUpdate(dt);
    this.physics.step((h1, h2) => this.weapons.handleCollision(h1, h2));
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
    const dt = Math.min(frameDt, 0.1);
    // El tiempo de las animaciones visuales (lava, parpadeos, nubes) sigue corriendo en pausa.
    this.time += dt;
    const camera = this.renderer.camera;
    this.player.updateCamera(camera, this.status === 'playing' ? alpha : 1);
    this.materials.update(this.time);
    this.lights.update(this.time, camera.position);
    this.sky?.update(this.time, camera);
    if (this.status === 'playing') {
      this.weapons.frameUpdate(dt, lookX, lookY, this.options.headBob);
      this.particles.update(dt, camera, this.renderer.bufferHeight);
      this.enemies.render(alpha, dt);
    }
    this.updateHud(dt);
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
    const status =
      state.phase === 'reloading' ? 'RECARGANDO' : state.phase === 'ready' ? '' : '···';
    this.readout.update(
      def.name,
      def.ammo ? state.magazines[state.current] : null,
      def.ammo ? state.ammo[def.ammo] : null,
      status,
      this.playerCombatant.health.health,
    );
    this.damageFlash.update(dt, this.player.dead);
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

  private respawnPlayer(): void {
    this.player.respawn();
    this.playerCombatant.health.reset();
    this.weapons.setVisible(true);
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
