import type { Vec3 } from '../../engine/physics/physics_world';

/**
 * Máquina de estados de la IA de los enemigos, pura (sin física ni Three.js): recibe lo que el
 * enemigo percibe y devuelve qué debe hacer. Los estados:
 *
 *   idle / patrol ──(ve al objetivo, oye un ruido o recibe daño)──▶ alert
 *   alert ──(tras el tiempo de reacción)──▶ chase
 *   chase ──(lo ve, está a tiro y sin enfriamiento)──▶ attack ──▶ chase
 *   chase ──(lo pierde de vista demasiado tiempo)──▶ patrol / idle
 *   cualquiera ──(dolor)──▶ pain ──▶ chase      cualquiera ──(salud ≤ 0)──▶ dead
 */

export type AiState = 'idle' | 'patrol' | 'alert' | 'chase' | 'attack' | 'pain' | 'dead';

export interface AiParams {
  /** Distancia máxima a la que ataca. */
  attackRange: number;
  /** Tiempo desde que empieza el ataque hasta que golpea o dispara. */
  attackWindup: number;
  /** Duración total de la animación de ataque. */
  attackDuration: number;
  /** Tiempo mínimo entre ataques. */
  attackCooldown: number;
  /** Tiempo que tarda en reaccionar al descubrir al objetivo. */
  reactionTime: number;
  painDuration: number;
  /** Segundos sin ver al objetivo antes de rendirse (tras llegar a donde lo vio por última vez). */
  giveUpTime: number;
}

export interface AiPerception {
  canSeeTarget: boolean;
  targetPosition: Vec3 | null;
  targetDistance: number;
  /** Posición de un ruido oído en este paso. */
  heardNoiseAt: Vec3 | null;
  /** Ha recibido daño en este paso (con la posición del atacante). */
  damagedFrom: Vec3 | null;
  /** El daño recibido provoca dolor (la probabilidad la decide quien llama). */
  painTriggered: boolean;
  health: number;
  hasPatrol: boolean;
  /** Ya está en el último punto conocido del objetivo (o no puede llegar). */
  reachedLastKnown: boolean;
}

export interface AiMemory {
  state: AiState;
  stateTime: number;
  lastKnown: Vec3 | null;
  timeSinceSeen: number;
  cooldown: number;
  /** Ya ha golpeado o disparado en el ataque actual. */
  struck: boolean;
}

export type MoveIntent = 'none' | 'patrol' | 'target' | 'lastKnown';

export interface AiCommand {
  move: MoveIntent;
  /** Hacia dónde mirar ('movement' = hacia donde camina). */
  face: 'target' | 'lastKnown' | 'movement' | 'none';
  /** Golpea o dispara en este paso (una sola vez por ataque). */
  strike: boolean;
  /** Acaba de entrar en este estado (para animaciones y sonidos). */
  entered: AiState | null;
}

export function createAiMemory(initial: 'idle' | 'patrol' = 'idle'): AiMemory {
  return {
    state: initial,
    stateTime: 0,
    lastKnown: null,
    timeSinceSeen: Infinity,
    cooldown: 0,
    struck: false,
  };
}

function enter(memory: AiMemory, state: AiState): AiState {
  memory.state = state;
  memory.stateTime = 0;
  memory.struck = false;
  return state;
}

export function stepAi(memory: AiMemory, p: AiPerception, params: AiParams, dt: number): AiCommand {
  let entered: AiState | null = null;
  memory.stateTime += dt;
  memory.cooldown = Math.max(0, memory.cooldown - dt);

  if (memory.state === 'dead') return { move: 'none', face: 'none', strike: false, entered: null };
  if (p.health <= 0) {
    entered = enter(memory, 'dead');
    return { move: 'none', face: 'none', strike: false, entered };
  }

  if (p.canSeeTarget && p.targetPosition) {
    memory.lastKnown = { ...p.targetPosition };
    memory.timeSinceSeen = 0;
  } else {
    memory.timeSinceSeen += dt;
  }
  const passive = memory.state === 'idle' || memory.state === 'patrol';

  // El daño despierta siempre y apunta hacia el atacante.
  if (p.damagedFrom) {
    if (!p.canSeeTarget) memory.lastKnown = { ...p.damagedFrom };
    if (p.painTriggered && memory.state !== 'pain') {
      entered = enter(memory, 'pain');
    } else if (passive) {
      entered = enter(memory, 'alert');
    }
  } else if (passive) {
    if (p.canSeeTarget) {
      entered = enter(memory, 'alert');
    } else if (p.heardNoiseAt) {
      memory.lastKnown = { ...p.heardNoiseAt };
      entered = enter(memory, 'alert');
    }
  }

  switch (memory.state) {
    case 'idle':
      return { move: 'none', face: 'none', strike: false, entered };
    case 'patrol':
      return { move: 'patrol', face: 'movement', strike: false, entered };
    case 'alert':
      if (memory.stateTime >= params.reactionTime) entered = enter(memory, 'chase');
      else return { move: 'none', face: 'lastKnown', strike: false, entered };
      break;
    case 'pain':
      if (memory.stateTime >= params.painDuration) entered = enter(memory, 'chase');
      else return { move: 'none', face: 'none', strike: false, entered };
      break;
    case 'attack': {
      let strike = false;
      if (!memory.struck && memory.stateTime >= params.attackWindup) {
        memory.struck = true;
        strike = true;
      }
      if (memory.stateTime >= params.attackDuration) {
        memory.cooldown = params.attackCooldown;
        entered = enter(memory, 'chase');
        return { move: 'target', face: 'target', strike, entered };
      }
      return { move: 'none', face: 'target', strike, entered };
    }
  }

  // Persecución.
  if (p.canSeeTarget && p.targetDistance <= params.attackRange && memory.cooldown <= 0) {
    entered = enter(memory, 'attack');
    return { move: 'none', face: 'target', strike: false, entered };
  }
  if (!p.canSeeTarget && memory.timeSinceSeen >= params.giveUpTime && p.reachedLastKnown) {
    memory.lastKnown = null;
    entered = enter(memory, p.hasPatrol ? 'patrol' : 'idle');
    return { move: 'none', face: 'none', strike: false, entered };
  }
  if (p.canSeeTarget) return { move: 'target', face: 'target', strike: false, entered };
  return {
    move: memory.lastKnown ? 'lastKnown' : 'none',
    face: 'movement',
    strike: false,
    entered,
  };
}
