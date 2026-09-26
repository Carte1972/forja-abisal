import type { Vec3 } from '../engine/physics/physics_world';
import type { WeaponId } from './weapons/weapon_defs';

/** Eventos que se cruzan los sistemas del juego a través del EventBus. */
export type GameEvents = {
  /** Ruido que alerta a los enemigos cercanos (disparos, explosiones). */
  noise: { position: Vec3; radius: number; source: 'player' | 'enemy' };
  explosion: { position: Vec3; radius: number };
  /** Daño recibido por el jugador. */
  playerDamaged: { amount: number; from: Vec3 };
  playerDied: Record<string, never>;
  enemyKilled: { kind: string; position: Vec3 };
  /** Texto breve para el jugador (llave necesaria, secreto encontrado...). */
  message: { text: string; color?: number };
  pickup: { id: string; name: string; color: number; weapon?: WeaponId };
  secretFound: Record<string, never>;
  levelComplete: Record<string, never>;
};
