import * as THREE from 'three';
import type { InputSystem } from '../../engine/input/input_system';
import { approach, clamp, lerp } from '../../engine/core/math_utils';
import { CharacterBody } from '../../engine/physics/character_controller';
import type { PhysicsWorld, Vec3 } from '../../engine/physics/physics_world';
import { CameraKick, CameraShake, HeadBob, LandingDip } from './camera_effects';
import {
  createMovementState,
  DEFAULT_MOVEMENT,
  horizontalSpeed,
  stepMovement,
  type MovementState,
} from './player_movement';

const CAPSULE = { radius: 0.35, standHeight: 1.8, crouchHeight: 1.1 };
const EYE_STAND = 1.62;
const EYE_CROUCH = 0.95;
const EYE_SPEED = 5;
const MAX_PITCH = THREE.MathUtils.degToRad(89);
const MOUSE_SENSITIVITY = 0.0022;

export interface PlayerSpawn {
  position: Vec3;
  yaw: number;
}

export interface PlayerOptions {
  headBob: boolean;
  /** Retroceso de cámara al disparar. */
  recoil: boolean;
  /** Multiplicador de la sensibilidad del ratón. */
  mouseSensitivity: number;
  invertY: boolean;
}

export class Player {
  yaw: number;
  pitch = 0;
  readonly movement: MovementState = createMovementState();
  readonly body: CharacterBody;
  private eyeHeight = EYE_STAND;
  private readonly prevEye = new THREE.Vector3();
  private readonly currEye = new THREE.Vector3();
  private readonly headBob = new HeadBob();
  private readonly landingDip = new LandingDip();
  private readonly kick = new CameraKick();
  /** Muerto: no responde a los controles y la cámara cae al suelo. */
  dead = false;
  private deathTime = 0;
  private readonly shake = new CameraShake();

  constructor(
    physics: PhysicsWorld,
    private readonly spawn: PlayerSpawn,
    private readonly options: PlayerOptions,
  ) {
    this.yaw = spawn.yaw;
    this.body = new CharacterBody(physics, spawn.position, CAPSULE);
    this.storeEye();
    this.prevEye.copy(this.currEye);
  }

  /** La vista se actualiza en cada frame (no a paso fijo) para que el ratón responda al instante. */
  applyLook(dx: number, dy: number): void {
    const sensitivity = MOUSE_SENSITIVITY * this.options.mouseSensitivity;
    this.yaw -= dx * sensitivity;
    const vertical = this.options.invertY ? -dy : dy;
    this.pitch = clamp(this.pitch - vertical * sensitivity, -MAX_PITCH, MAX_PITCH);
  }

  /** Retroceso al disparar (si está activado en las opciones). */
  addRecoil(pitch: number, yaw: number): void {
    if (this.options.recoil) this.kick.add(pitch, yaw);
  }

  addShake(amount: number): void {
    this.shake.add(amount);
  }

  /**
   * Impulso externo (empuje de una explosión, golpes). Un impulso hacia arriba despega al
   * jugador del suelo, lo que permite el rocket jump.
   */
  applyImpulse(impulse: Vec3): void {
    const v = this.movement.velocity;
    v.x += impulse.x;
    v.y += impulse.y;
    v.z += impulse.z;
    if (impulse.y > 0.5) {
      this.movement.grounded = false;
      this.movement.timeSinceGrounded = DEFAULT_MOVEMENT.coyoteTime;
    }
  }

  /** Centro del cuerpo (para distancias de explosiones y, en la fase 5, para los enemigos). */
  center(): Vec3 {
    const feet = this.body.feetPosition;
    return { x: feet.x, y: feet.y + this.body.height / 2, z: feet.z };
  }

  fixedUpdate(input: InputSystem, dt: number): void {
    this.prevEye.copy(this.currEye);
    this.kick.update(dt);
    this.shake.update(dt);
    if (this.dead) {
      this.deathTime += dt;
      return;
    }

    const crouched = this.body.setCrouched(input.isDown('crouch'));

    // Dirección deseada en el mundo a partir de la orientación horizontal de la cámara.
    const forward = (input.isDown('forward') ? 1 : 0) - (input.isDown('back') ? 1 : 0);
    const strafe = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    let wishX = -sin * forward + cos * strafe;
    let wishZ = -cos * forward - sin * strafe;
    const length = Math.hypot(wishX, wishZ);
    if (length > 1) {
      wishX /= length;
      wishZ /= length;
    }

    const state = this.movement;
    stepMovement(
      state,
      {
        wishX,
        wishZ,
        run: input.isDown('run'),
        crouched,
        jumpPressed: input.consumePressed('jump'),
      },
      DEFAULT_MOVEMENT,
      dt,
    );

    const v = state.velocity;
    const desired = { x: v.x * dt, y: v.y * dt, z: v.z * dt };
    const { movement, grounded, wallNormals } = this.body.move(desired);

    // Si una pared ha frenado el avance, quitamos la componente de la velocidad que la empuja
    // (así se desliza a lo largo de ella). Rampas y escalones no cuentan como paredes.
    const desiredHorizontal = Math.hypot(desired.x, desired.z);
    const actualHorizontal = Math.hypot(movement.x, movement.z);
    if (desiredHorizontal > 1e-6 && actualHorizontal < desiredHorizontal * 0.99) {
      for (const n of wallNormals) {
        const into = v.x * n.x + v.z * n.z;
        if (into < 0) {
          v.x -= into * n.x;
          v.z -= into * n.z;
        }
      }
    }
    // Golpe con el techo.
    if (desired.y > 0 && movement.y < desired.y * 0.5) {
      v.y = 0;
    }
    if (grounded && !state.grounded && v.y < 0) {
      this.landingDip.land(-v.y);
    }
    if (grounded && v.y < 0) {
      v.y = 0;
    }
    state.grounded = grounded;

    this.eyeHeight = approach(this.eyeHeight, crouched ? EYE_CROUCH : EYE_STAND, EYE_SPEED * dt);
    this.headBob.update(horizontalSpeed(v), grounded, DEFAULT_MOVEMENT.walkSpeed, dt);
    this.landingDip.update(dt);

    if (this.body.feetPosition.y < -50) {
      this.respawn();
    }
    this.storeEye();
  }

  updateCamera(camera: THREE.PerspectiveCamera, alpha: number): void {
    const bob = this.headBob.offset(this.options.headBob);
    camera.position.set(
      lerp(this.prevEye.x, this.currEye.x, alpha),
      lerp(this.prevEye.y, this.currEye.y, alpha) + bob.y + this.landingDip.offset,
      lerp(this.prevEye.z, this.currEye.z, alpha),
    );
    const shake = this.shake.offset();
    if (this.dead) {
      // La cámara cae al suelo y se ladea.
      const t = Math.min(this.deathTime / 0.8, 1);
      const ease = t * t * (3 - 2 * t);
      camera.position.y -= (this.eyeHeight - 0.25) * ease;
      camera.rotation.set(this.pitch * (1 - ease) + 0.25 * ease, this.yaw, 0.9 * ease);
      return;
    }
    camera.rotation.set(
      clamp(this.pitch + this.kick.pitch + shake.pitch, -MAX_PITCH, MAX_PITCH),
      this.yaw + this.kick.yaw + shake.yaw,
      0,
    );
    if (bob.x !== 0) {
      // El balanceo lateral va en el eje derecho de la cámara.
      camera.position.x += Math.cos(this.yaw) * bob.x;
      camera.position.z -= Math.sin(this.yaw) * bob.x;
    }
  }

  die(): void {
    this.dead = true;
    this.deathTime = 0;
    this.movement.velocity = { x: 0, y: 0, z: 0 };
  }

  respawn(): void {
    this.dead = false;
    this.body.teleport(this.spawn.position);
    this.movement.velocity = { x: 0, y: 0, z: 0 };
    this.yaw = this.spawn.yaw;
    this.pitch = 0;
    this.storeEye();
    this.prevEye.copy(this.currEye);
  }

  dispose(): void {
    this.body.dispose();
  }

  private storeEye(): void {
    const feet = this.body.feetPosition;
    this.currEye.set(feet.x, feet.y + this.eyeHeight, feet.z);
  }
}
