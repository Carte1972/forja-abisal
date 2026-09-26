import type { Vec3 } from '../../engine/physics/physics_world';

export type DamageSource = 'player' | 'enemy' | 'environment';

export interface DamageInfo {
  amount: number;
  point: Vec3;
  /** Dirección del golpe (normalizada), para el empuje y la sangre. */
  direction: Vec3;
  knockback: number;
  source: DamageSource;
  /** Quién ha causado el daño (para que los enemigos se peleen entre sí en la fase 5). */
  attacker?: unknown;
}

/** Cualquier cosa que puede recibir daño: enemigos, y más adelante barriles u otros objetos. */
export interface Damageable {
  readonly alive: boolean;
  /** Color de la sangre (no realista: verde, azul...). */
  readonly bloodColor: number;
  center(): Vec3;
  applyDamage(info: DamageInfo): void;
}

/** Relaciona colliders de Rapier con entidades que reciben daño. */
export class DamageRegistry {
  private readonly byCollider = new Map<number, Damageable>();

  register(colliderHandle: number, target: Damageable): void {
    this.byCollider.set(colliderHandle, target);
  }

  unregister(colliderHandle: number): void {
    this.byCollider.delete(colliderHandle);
  }

  lookup(colliderHandle: number): Damageable | undefined {
    return this.byCollider.get(colliderHandle);
  }

  /** Objetivos vivos dentro de un radio (para las explosiones). */
  within(center: Vec3, radius: number): Damageable[] {
    const seen = new Set<Damageable>();
    for (const target of this.byCollider.values()) {
      if (!target.alive || seen.has(target)) continue;
      const c = target.center();
      if (Math.hypot(c.x - center.x, c.y - center.y, c.z - center.z) <= radius) seen.add(target);
    }
    return [...seen];
  }
}

/** Daño de una explosión según la distancia: máximo en el centro y cero en el borde. */
export function explosionFalloff(distance: number, radius: number): number {
  if (distance >= radius) return 0;
  return 1 - (distance / radius) ** 1.5;
}
