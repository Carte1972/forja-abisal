import { describe, expect, it } from 'vitest';
import {
  createMovementState,
  DEFAULT_MOVEMENT,
  horizontalSpeed,
  stepMovement,
  type MovementInput,
} from './player_movement';

const DT = 1 / 60;
const IDLE: MovementInput = { wishX: 0, wishZ: 0, run: false, crouched: false, jumpPressed: false };

function simulate(input: MovementInput, seconds: number, grounded = true) {
  const state = createMovementState();
  state.grounded = grounded;
  for (let t = 0; t < seconds; t += DT) {
    stepMovement(state, input, DEFAULT_MOVEMENT, DT);
    state.grounded = grounded;
    if (grounded) state.velocity.y = 0;
  }
  return state;
}

describe('stepMovement', () => {
  it('acelera hasta la velocidad de andar y no la supera', () => {
    const state = simulate({ ...IDLE, wishZ: -1 }, 2);
    expect(horizontalSpeed(state.velocity)).toBeCloseTo(DEFAULT_MOVEMENT.walkSpeed, 1);
    expect(state.velocity.z).toBeLessThan(0);
  });

  it('corre más rápido con run y va más lento agachado', () => {
    const running = simulate({ ...IDLE, wishX: 1, run: true }, 2);
    const crouched = simulate({ ...IDLE, wishX: 1, run: true, crouched: true }, 2);
    expect(horizontalSpeed(running.velocity)).toBeCloseTo(DEFAULT_MOVEMENT.runSpeed, 1);
    expect(horizontalSpeed(crouched.velocity)).toBeCloseTo(DEFAULT_MOVEMENT.crouchSpeed, 1);
  });

  it('la diagonal no es más rápida que la recta', () => {
    const state = simulate({ ...IDLE, wishX: 1, wishZ: 1 }, 2);
    expect(horizontalSpeed(state.velocity)).toBeLessThanOrEqual(DEFAULT_MOVEMENT.walkSpeed + 1e-6);
  });

  it('la fricción detiene al jugador en suelo sin input', () => {
    const state = createMovementState();
    state.grounded = true;
    state.velocity.x = 10;
    for (let i = 0; i < 60; i++) stepMovement(state, IDLE, DEFAULT_MOVEMENT, DT);
    expect(horizontalSpeed(state.velocity)).toBe(0);
  });

  it('en el aire conserva la inercia (sin fricción)', () => {
    const state = createMovementState();
    state.grounded = false;
    state.velocity.x = 10;
    stepMovement(state, IDLE, DEFAULT_MOVEMENT, DT);
    expect(state.velocity.x).toBe(10);
  });

  it('aplica la gravedad en el aire con velocidad terminal', () => {
    const state = simulate(IDLE, 5, false);
    expect(state.velocity.y).toBe(-DEFAULT_MOVEMENT.maxFallSpeed);
  });

  it('salta desde el suelo', () => {
    const state = createMovementState();
    state.grounded = true;
    const { jumped } = stepMovement(state, { ...IDLE, jumpPressed: true }, DEFAULT_MOVEMENT, DT);
    expect(jumped).toBe(true);
    expect(state.velocity.y).toBe(DEFAULT_MOVEMENT.jumpSpeed);
  });

  it('permite saltar poco después de dejar el suelo (coyote time), pero no dos veces', () => {
    const state = createMovementState();
    state.grounded = true;
    stepMovement(state, IDLE, DEFAULT_MOVEMENT, DT);
    state.grounded = false;
    expect(stepMovement(state, { ...IDLE, jumpPressed: true }, DEFAULT_MOVEMENT, DT).jumped).toBe(
      true,
    );
    state.velocity.y = -1;
    expect(stepMovement(state, { ...IDLE, jumpPressed: true }, DEFAULT_MOVEMENT, DT).jumped).toBe(
      false,
    );
  });

  it('recuerda un salto pulsado justo antes de aterrizar', () => {
    const state = createMovementState();
    state.grounded = false;
    state.timeSinceGrounded = 1;
    state.velocity.y = -5;
    stepMovement(state, { ...IDLE, jumpPressed: true }, DEFAULT_MOVEMENT, DT);
    state.grounded = true;
    state.velocity.y = 0;
    expect(stepMovement(state, IDLE, DEFAULT_MOVEMENT, DT).jumped).toBe(true);
  });

  it('no salta en el aire sin coyote time', () => {
    const state = createMovementState();
    state.grounded = false;
    state.timeSinceGrounded = 1;
    expect(stepMovement(state, { ...IDLE, jumpPressed: true }, DEFAULT_MOVEMENT, DT).jumped).toBe(
      false,
    );
  });

  it('en el aire solo permite ganar una velocidad limitada desde parado', () => {
    const state = simulate({ ...IDLE, wishX: 1 }, 1, false);
    expect(horizontalSpeed(state.velocity)).toBeCloseTo(DEFAULT_MOVEMENT.airSpeedCap, 1);
  });
});
