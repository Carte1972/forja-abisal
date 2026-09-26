/**
 * Ciclo de puertas y ascensores, puro. El progreso va de 0 (posición inicial: puerta cerrada,
 * ascensor arriba) a 1 (puerta abierta, ascensor abajo). Ambos se activan, recorren el trayecto,
 * esperan y vuelven solos. Si algo bloquea la vuelta (alguien bajo la puerta), se reabren.
 */

export type MoverPhase = 'rest' | 'going' | 'waiting' | 'returning';

export interface MoverState {
  phase: MoverPhase;
  progress: number;
  timer: number;
}

export interface MoverParams {
  /** Recorrido en metros (valor absoluto). */
  travel: number;
  /** Velocidad en m/s. */
  speed: number;
  /** Segundos en la posición final antes de volver; 0 = se queda (solo puertas). */
  waitTime: number;
}

export type MoverEvent = 'start' | 'arrive' | 'return' | 'rest' | 'reopen';

export function createMoverState(): MoverState {
  return { phase: 'rest', progress: 0, timer: 0 };
}

/** Activación (usar la puerta o el ascensor). Devuelve si ha tenido efecto. */
export function activateMover(state: MoverState): boolean {
  if (state.phase === 'rest' || state.phase === 'returning') {
    state.phase = 'going';
    return true;
  }
  if (state.phase === 'waiting') {
    // Volver a usarlo mientras espera reinicia la espera.
    state.timer = 0;
    return false;
  }
  return false;
}

/**
 * Avanza el ciclo. `blocked` indica que hay alguien que impide volver (bajo la puerta).
 * Devuelve los eventos ocurridos en este paso (para sonidos).
 */
export function stepMover(
  state: MoverState,
  params: MoverParams,
  blocked: boolean,
  dt: number,
): MoverEvent[] {
  const events: MoverEvent[] = [];
  const rate = params.travel > 0 ? params.speed / params.travel : 1;
  switch (state.phase) {
    case 'rest':
      break;
    case 'going':
      if (state.progress === 0) events.push('start');
      state.progress = Math.min(1, state.progress + rate * dt);
      if (state.progress >= 1) {
        state.phase = 'waiting';
        state.timer = 0;
        events.push('arrive');
      }
      break;
    case 'waiting':
      if (params.waitTime <= 0) break;
      state.timer += dt;
      if (state.timer >= params.waitTime && !blocked) {
        state.phase = 'returning';
        events.push('return');
      }
      break;
    case 'returning':
      if (blocked) {
        state.phase = 'going';
        events.push('reopen');
        break;
      }
      state.progress = Math.max(0, state.progress - rate * dt);
      if (state.progress <= 0) {
        state.phase = 'rest';
        events.push('rest');
      }
      break;
  }
  return events;
}
