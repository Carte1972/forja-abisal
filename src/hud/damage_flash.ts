/** Destello rojo al recibir daño (provisional hasta el HUD completo de la fase 6). */
export class DamageFlash {
  private readonly element: HTMLDivElement;
  private intensity = 0;
  private shown = -1;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'damage-flash';
    parent.appendChild(this.element);
  }

  hit(amount: number): void {
    this.intensity = Math.min(0.75, this.intensity + 0.2 + amount / 60);
  }

  update(dt: number, dead: boolean): void {
    this.intensity = dead
      ? Math.min(0.55, this.intensity + dt)
      : Math.max(0, this.intensity - dt * 1.8);
    const value = Math.round(this.intensity * 100) / 100;
    if (value !== this.shown) {
      this.shown = value;
      this.element.style.opacity = String(value);
    }
  }

  dispose(): void {
    this.element.remove();
  }
}
