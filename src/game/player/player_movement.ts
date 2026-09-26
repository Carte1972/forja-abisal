import type { Vec3 } from '../../engine/physics/physics_world';

export interface MovementParams {
  walkSpeed: number;
  runSpeed: number;
  crouchSpeed: number;
  groundAccel: number;
  airAccel: number;
  /** Velocidad máxima que se puede ganar en el aire en la dirección deseada. */
  airSpeedCap: number;
  friction: number;
  /** Por debajo de esta velocidad la fricción frena como si fuéramos a esta velocidad. */
  stopSpeed: number;
  gravity: number;
  jumpSpeed: number;
  maxFallSpeed: number;
  /** Margen para saltar justo después de dejar el suelo. */
  coyoteTime: number;
  /** Margen para recordar un salto pulsado justo antes de tocar el suelo. */
  jumpBufferTime: number;
}

export const DEFAULT_MOVEMENT: MovementParams = {
  walkSpeed: 7,
  runSpeed: 11,
  crouchSpeed: 3.5,
  groundAccel: 12,
  airAccel: 10,
  airSpeedCap: 2.5,
  friction: 8,
  stopSpeed: 2.5,
  gravity: 22,
  jumpSpeed: 7.5,
  maxFallSpeed: 40,
  coyoteTime: 0.1,
  jumpBufferTime: 0.12,
};

export interface MovementState {
  velocity: Vec3;
  grounded: boolean;
  timeSinceGrounded: number;
  jumpBuffer: number;
}

export interface MovementInput {
  /** Dirección deseada en el plano XZ del mundo; longitud entre 0 y 1. */
  wishX: number;
  wishZ: number;
  run: boolean;
  crouched: boolean;
  jumpPressed: boolean;
}

export function createMovementState(): MovementState {
  return {
    velocity: { x: 0, y: 0, z: 0 },
    grounded: false,
    timeSinceGrounded: 0,
    jumpBuffer: 0,
  };
}

export function horizontalSpeed(v: Vec3): number {
  return Math.hypot(v.x, v.z);
}

/**
 * Integra un paso de movimiento estilo arcade (aceleración y fricción al estilo de los
 * shooters clásicos). Modifica `state.velocity` y devuelve si se ha iniciado un salto.
 */
export function stepMovement(
  state: MovementState,
  input: MovementInput,
  params: MovementParams,
  dt: number,
): { jumped: boolean } {
  const v = state.velocity;
  const wishLength = Math.min(Math.hypot(input.wishX, input.wishZ), 1);
  const dirX = wishLength > 1e-6 ? input.wishX / Math.hypot(input.wishX, input.wishZ) : 0;
  const dirZ = wishLength > 1e-6 ? input.wishZ / Math.hypot(input.wishX, input.wishZ) : 0;
  const maxSpeed = input.crouched
    ? params.crouchSpeed
    : input.run
      ? params.runSpeed
      : params.walkSpeed;
  const wishSpeed = maxSpeed * wishLength;

  if (state.grounded) {
    applyFriction(v, params, dt);
    accelerate(v, dirX, dirZ, wishSpeed, wishSpeed, params.groundAccel, dt);
  } else {
    accelerate(
      v,
      dirX,
      dirZ,
      wishSpeed,
      Math.min(wishSpeed, params.airSpeedCap),
      params.airAccel,
      dt,
    );
  }

  state.timeSinceGrounded = state.grounded ? 0 : state.timeSinceGrounded + dt;
  state.jumpBuffer = input.jumpPressed ? params.jumpBufferTime : Math.max(state.jumpBuffer - dt, 0);

  let jumped = false;
  const canJump = state.grounded || state.timeSinceGrounded < params.coyoteTime;
  if (state.jumpBuffer > 0 && canJump && v.y <= 0) {
    v.y = params.jumpSpeed;
    state.jumpBuffer = 0;
    state.grounded = false;
    // Consume el margen de coyote para que no haya doble salto.
    state.timeSinceGrounded = params.coyoteTime;
    jumped = true;
  } else {
    v.y = Math.max(v.y - params.gravity * dt, -params.maxFallSpeed);
  }

  return { jumped };
}

function applyFriction(v: Vec3, params: MovementParams, dt: number): void {
  const speed = horizontalSpeed(v);
  if (speed < 1e-4) {
    v.x = 0;
    v.z = 0;
    return;
  }
  const control = Math.max(speed, params.stopSpeed);
  const newSpeed = Math.max(speed - control * params.friction * dt, 0);
  const scale = newSpeed / speed;
  v.x *= scale;
  v.z *= scale;
}

function accelerate(
  v: Vec3,
  dirX: number,
  dirZ: number,
  wishSpeed: number,
  speedCap: number,
  accel: number,
  dt: number,
): void {
  if (wishSpeed <= 0) return;
  const current = v.x * dirX + v.z * dirZ;
  const add = speedCap - current;
  if (add <= 0) return;
  const accelSpeed = Math.min(accel * wishSpeed * dt, add);
  v.x += accelSpeed * dirX;
  v.z += accelSpeed * dirZ;
}
