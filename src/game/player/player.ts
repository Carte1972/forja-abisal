import * as THREE from 'three';
import type { InputSystem } from '../../engine/input/input_system';
import { approach, clamp, lerp } from '../../engine/core/math_utils';
import { CharacterBody } from '../../engine/physics/character_controller';
import type { PhysicsWorld, Vec3 } from '../../engine/physics/physics_world';
import { HeadBob, LandingDip } from './camera_effects';
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
    this.yaw -= dx * MOUSE_SENSITIVITY;
    this.pitch = clamp(this.pitch - dy * MOUSE_SENSITIVITY, -MAX_PITCH, MAX_PITCH);
  }

  fixedUpdate(input: InputSystem, dt: number): void {
    this.prevEye.copy(this.currEye);

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
    const { movement, grounded } = this.body.move(desired);

    // Contra una pared solo conservamos la velocidad que realmente se ha podido aplicar.
    const desiredHorizontal = Math.hypot(desired.x, desired.z);
    const actualHorizontal = Math.hypot(movement.x, movement.z);
    if (desiredHorizontal > 1e-6 && actualHorizontal < desiredHorizontal * 0.99) {
      v.x = movement.x / dt;
      v.z = movement.z / dt;
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
    camera.rotation.set(this.pitch, this.yaw, 0);
    if (bob.x !== 0) {
      // El balanceo lateral va en el eje derecho de la cámara.
      camera.position.x += Math.cos(this.yaw) * bob.x;
      camera.position.z -= Math.sin(this.yaw) * bob.x;
    }
  }

  respawn(): void {
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
