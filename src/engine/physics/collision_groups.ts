/**
 * Grupos de colisión de Rapier. Dos colliders interactúan si la pertenencia de cada uno está
 * en el filtro del otro. Las consultas (rayos, formas) usan la misma regla.
 */
export const GROUP = {
  STATIC: 1 << 0,
  PLAYER: 1 << 1,
  ENEMY: 1 << 2,
  PROJECTILE: 1 << 3,
  MOVER: 1 << 4,
  /** Pertenencia de los rayos de disparo. */
  HITSCAN: 1 << 5,
} as const;

export const ALL_GROUPS = 0xffff;

/** Empaqueta pertenencia (16 bits altos) y filtro (16 bits bajos). */
export function interactionGroups(membership: number, filter: number): number {
  return ((membership & 0xffff) << 16) | (filter & 0xffff);
}

/** Lo que bloquea a los personajes y a los proyectiles: el nivel y los enemigos. */
export const SOLID_WORLD = GROUP.STATIC | GROUP.MOVER | GROUP.ENEMY;
