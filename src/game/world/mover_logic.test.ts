import { describe, expect, it } from 'vitest';
import { activateMover, createMoverState, stepMover, type MoverEvent } from './mover_logic';

const PARAMS = { travel: 3, speed: 3, waitTime: 2 };
const DT = 1 / 60;

function run(
  state: ReturnType<typeof createMoverState>,
  seconds: number,
  blocked = false,
  params = PARAMS,
) {
  const events: MoverEvent[] = [];
  for (let t = 0; t < seconds - 1e-9; t += DT)
    events.push(...stepMover(state, params, blocked, DT));
  return events;
}

describe('mover_logic', () => {
  it('en reposo no se mueve', () => {
    const state = createMoverState();
    run(state, 1);
    expect(state).toMatchObject({ phase: 'rest', progress: 0 });
  });

  it('al activarlo recorre el trayecto a su velocidad, espera y vuelve', () => {
    const state = createMoverState();
    expect(activateMover(state)).toBe(true);
    const events = run(state, 1.05);
    expect(events).toEqual(['start', 'arrive']);
    expect(state.progress).toBe(1);
    expect(run(state, 1.9)).toEqual([]);
    expect(run(state, 0.2)).toEqual(['return']);
    run(state, 1.1);
    expect(state).toMatchObject({ phase: 'rest', progress: 0 });
  });

  it('si algo bloquea la vuelta, se reabre', () => {
    const state = createMoverState();
    activateMover(state);
    run(state, 3.2);
    expect(state.phase).toBe('returning');
    const events = run(state, DT, true);
    expect(events).toEqual(['reopen']);
    expect(state.phase).toBe('going');
  });

  it('bloqueada en la espera no empieza a volver', () => {
    const state = createMoverState();
    activateMover(state);
    run(state, 5, true);
    expect(state.phase).toBe('waiting');
  });

  it('con espera 0 se queda en la posición final', () => {
    const state = createMoverState();
    activateMover(state);
    run(state, 10, false, { ...PARAMS, waitTime: 0 });
    expect(state).toMatchObject({ phase: 'waiting', progress: 1 });
  });

  it('se puede reactivar mientras vuelve', () => {
    const state = createMoverState();
    activateMover(state);
    run(state, 3.5);
    expect(state.phase).toBe('returning');
    expect(activateMover(state)).toBe(true);
    expect(state.phase).toBe('going');
  });
});
