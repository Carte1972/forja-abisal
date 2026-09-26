import type { AiParams } from './ai_state_machine';

/** Tipos de enemigo. Todos los diseños y nombres son originales. */
export type EnemyKind = 'sentinel' | 'crawler' | 'spitter' | 'watcher';
export const ENEMY_KINDS: readonly EnemyKind[] = ['sentinel', 'crawler', 'spitter', 'watcher'];

export type EnemyAttack =
  | { kind: 'hitscan'; damage: number; spread: number; shots: number }
  | { kind: 'melee'; damage: number; reach: number }
  | { kind: 'projectile'; projectile: 'acid' | 'bolt'; damage: number; speed: number };

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  health: number;
  /** Velocidad de desplazamiento (m/s). */
  speed: number;
  radius: number;
  height: number;
  flying: boolean;
  /** Altura de vuelo sobre el objetivo (solo voladores). */
  hover?: number;
  /** Distancia a la que prefiere quedarse del objetivo al atacar a distancia. */
  preferredRange: number;
  sightRange: number;
  /** Ángulo total del cono de visión (grados). */
  fov: number;
  painChance: number;
  bloodColor: number;
  attack: EnemyAttack;
  ai: AiParams;
}

const deg = (d: number) => (d * Math.PI) / 180;

export const ENEMIES: Readonly<Record<EnemyKind, EnemyDef>> = {
  // Centinela: soldado acorazado con visor rojo que dispara ráfagas cortas.
  sentinel: {
    kind: 'sentinel',
    name: 'Centinela',
    health: 60,
    speed: 3.2,
    radius: 0.4,
    height: 1.8,
    flying: false,
    preferredRange: 12,
    sightRange: 40,
    fov: 140,
    painChance: 0.6,
    bloodColor: 0x38e060,
    attack: { kind: 'hitscan', damage: 5, spread: deg(3.5), shots: 3 },
    ai: {
      attackRange: 28,
      attackWindup: 0.4,
      attackDuration: 0.9,
      attackCooldown: 1.2,
      reactionTime: 0.35,
      painDuration: 0.35,
      giveUpTime: 8,
    },
  },
  // Rastrero: criatura encorvada de brazos largos, muy rápida, que ataca con garras.
  crawler: {
    kind: 'crawler',
    name: 'Rastrero',
    health: 45,
    speed: 7,
    radius: 0.42,
    height: 1.3,
    flying: false,
    preferredRange: 0,
    sightRange: 35,
    fov: 160,
    painChance: 0.3,
    bloodColor: 0x3aa0ff,
    attack: { kind: 'melee', damage: 12, reach: 1.7 },
    ai: {
      attackRange: 1.6,
      attackWindup: 0.22,
      attackDuration: 0.5,
      attackCooldown: 0.35,
      reactionTime: 0.2,
      painDuration: 0.25,
      giveUpTime: 10,
    },
  },
  // Escupidor: mole con sacos de ácido brillantes que lanza bolas corrosivas.
  spitter: {
    kind: 'spitter',
    name: 'Escupidor',
    health: 130,
    speed: 2.3,
    radius: 0.55,
    height: 2.1,
    flying: false,
    preferredRange: 14,
    sightRange: 40,
    fov: 120,
    painChance: 0.35,
    bloodColor: 0xb4ff2a,
    attack: { kind: 'projectile', projectile: 'acid', damage: 18, speed: 13 },
    ai: {
      attackRange: 30,
      attackWindup: 0.55,
      attackDuration: 1.1,
      attackCooldown: 1.8,
      reactionTime: 0.5,
      painDuration: 0.45,
      giveUpTime: 8,
    },
  },
  // Vigía: orbe volador con un ojo y aletas giratorias que dispara descargas de energía.
  watcher: {
    kind: 'watcher',
    name: 'Vigía',
    health: 55,
    speed: 4.5,
    radius: 0.45,
    height: 0.9,
    flying: true,
    hover: 2.2,
    preferredRange: 9,
    sightRange: 45,
    fov: 200,
    painChance: 0.5,
    bloodColor: 0xc060ff,
    attack: { kind: 'projectile', projectile: 'bolt', damage: 10, speed: 20 },
    ai: {
      attackRange: 30,
      attackWindup: 0.35,
      attackDuration: 0.7,
      attackCooldown: 1.4,
      reactionTime: 0.3,
      painDuration: 0.3,
      giveUpTime: 8,
    },
  },
};

export function isEnemyKind(value: unknown): value is EnemyKind {
  return typeof value === 'string' && (ENEMY_KINDS as readonly string[]).includes(value);
}
