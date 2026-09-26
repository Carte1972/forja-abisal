/** Indicador provisional de arma y munición (el HUD completo llega en la fase 6). */
export class WeaponReadout {
  private readonly element: HTMLDivElement;
  private text = '';

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'weapon-readout';
    parent.appendChild(this.element);
  }

  update(
    name: string,
    magazine: number | null,
    reserve: number | null,
    status: string,
    health: number,
  ): void {
    const ammo =
      magazine === null ? '—' : reserve === null ? `${magazine}` : `${magazine} / ${reserve}`;
    const text = `SALUD ${Math.ceil(health)}\n${name}\n${ammo}${status ? `  ${status}` : ''}`;
    if (text === this.text) return;
    this.text = text;
    this.element.textContent = text;
  }

  dispose(): void {
    this.element.remove();
  }
}
