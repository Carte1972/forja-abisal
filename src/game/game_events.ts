import type { Vec3 } from '../engine/physics/physics_world';

/** Eventos que se cruzan los sistemas del juego a través del EventBus. */
export type GameEvents = {
  /** Ruido que alerta a los enemigos cercanos (disparos, explosiones). */
  noise: { position: Vec3; radius: number; source: 'player' | 'enemy' };
  explosion: { position: Vec3; radius: number };
  /** Daño recibido por el jugador. */
  playerDamaged: { amount: number; from: Vec3 };
  playerDied: Record<string, never>;
  enemyKilled: { kind: string; position: Vec3 };
};
