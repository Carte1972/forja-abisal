/**
 * Salud y armadura del jugador. La armadura absorbe un tercio del daño mientras dure
 * (las recogidas de salud y armadura llegan en la fase 6).
 */
export class PlayerHealth {
  health: number;
  armor = 0;

  constructor(readonly maxHealth = 100) {
    this.health = maxHealth;
  }

  get alive(): boolean {
    return this.health > 0;
  }

  /** Aplica daño y devuelve cuánta salud se ha perdido. */
  takeDamage(amount: number): number {
    if (!this.alive || amount <= 0) return 0;
    const absorbed = Math.min(this.armor, amount / 3);
    this.armor -= absorbed;
    const lost = Math.min(this.health, amount - absorbed);
    this.health -= lost;
    return lost;
  }

  reset(): void {
    this.health = this.maxHealth;
    this.armor = 0;
  }
}
