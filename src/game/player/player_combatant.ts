import type { EventBus } from '../../engine/core/event_bus';
import type { Vec3 } from '../../engine/physics/physics_world';
import type { Combatant } from '../enemies/enemy';
import type { GameEvents } from '../game_events';
import type { DamageInfo } from '../rules/damage';
import { PlayerHealth } from '../rules/player_health';
import type { Player } from './player';

/** El jugador visto como objetivo: recibe daño, empuje y avisa al resto del juego. */
export class PlayerCombatant implements Combatant {
  readonly health = new PlayerHealth();
  readonly bloodColor = 0x000000;

  constructor(
    private readonly player: Player,
    private readonly bus: EventBus<GameEvents>,
  ) {}

  get alive(): boolean {
    return this.health.alive;
  }

  get colliderHandle(): number {
    return this.player.body.collider.handle;
  }

  center(): Vec3 {
    return this.player.center();
  }

  applyDamage(info: DamageInfo): void {
    if (!this.alive) return;
    const lost = this.health.takeDamage(info.amount);
    if (info.knockback > 0) {
      this.player.applyImpulse({
        x: info.direction.x * info.knockback,
        y: 0,
        z: info.direction.z * info.knockback,
      });
    }
    const attacker = info.attacker as { center?: () => Vec3 } | undefined;
    const from = attacker?.center ? attacker.center() : info.point;
    if (lost > 0) {
      this.player.addShake(Math.min(0.5, lost / 40));
      this.bus.emit('playerDamaged', { amount: lost, from });
    }
    if (!this.alive) this.bus.emit('playerDied', {});
  }
}
