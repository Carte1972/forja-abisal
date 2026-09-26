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

/**
 * Relaciona colliders de Rapier con entidades que reciben daño. El jugador se registra aparte:
 * los rayos y proyectiles lo encuentran, pero las explosiones lo tratan por separado (empuje).
 */
export class DamageRegistry {
  private readonly byCollider = new Map<number, Damageable>();
  private player: { handle: number; target: Damageable } | null = null;

  registerPlayer(colliderHandle: number, target: Damageable): void {
    this.player = { handle: colliderHandle, target };
  }

  register(colliderHandle: number, target: Damageable): void {
    this.byCollider.set(colliderHandle, target);
  }

  unregister(colliderHandle: number): void {
    this.byCollider.delete(colliderHandle);
  }

  lookup(colliderHandle: number): Damageable | undefined {
    if (this.player?.handle === colliderHandle) return this.player.target;
    return this.byCollider.get(colliderHandle);
  }

  get playerTarget(): Damageable | null {
    return this.player?.target ?? null;
  }

  /** Objetivos vivos dentro de un radio (para las explosiones), sin incluir al jugador. */
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
