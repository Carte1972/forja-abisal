import { GameLoop } from '../engine/core/game_loop';
import { InputSystem } from '../engine/input/input_system';
import { buildLevel, type LoadedLevel } from '../engine/level/level_builder';
import { parseLevel } from '../engine/level/level_parser';
import { initPhysics, PhysicsWorld } from '../engine/physics/physics_world';
import { PlaceholderMaterials } from '../engine/render/placeholder_materials';
import { Renderer } from '../engine/render/renderer';
import testLevel from '../levels/test_level.json';
import { Player } from './player/player';
import { addProvisionalLighting } from './provisional_lighting';

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
  private readonly materials = new PlaceholderMaterials();
  readonly level: LoadedLevel;
  private readonly player: Player;
  private readonly loop: GameLoop;
  private status: GameStatus = 'ready';
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
    addProvisionalLighting(this.renderer.scene);
    this.level = buildLevel(
      parseLevel(testLevel),
      this.renderer.scene,
      this.physics,
      this.materials,
    );
    this.player = new Player(this.physics, this.level.spawn, { headBob: true });

    this.unsubscribeLock = this.input.onPointerLockChanged((locked) => {
      this.setStatus(locked ? 'playing' : 'paused');
    });

    this.loop = new GameLoop(
      {
        fixedUpdate: (dt) => this.fixedUpdate(dt),
        render: (alpha) => this.render(alpha),
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
    this.physics.dispose();
    this.renderer.dispose();
  }

  private fixedUpdate(dt: number): void {
    if (this.status !== 'playing') return;
    this.player.fixedUpdate(this.input, dt);
    this.physics.step();
  }

  private render(alpha: number): void {
    if (this.status === 'playing') {
      const look = this.input.consumeMouseDelta();
      this.player.applyLook(look.x, look.y);
    }
    this.player.updateCamera(this.renderer.camera, this.status === 'playing' ? alpha : 1);
    this.renderer.render();
  }

  private setStatus(status: GameStatus): void {
    if (status === this.status) return;
    this.status = status;
    this.callbacks.onStatusChange(status);
  }
}
