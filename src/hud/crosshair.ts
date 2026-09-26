/**
 * Punto de mira dinámico: cuatro trazos que se separan según la dispersión del arma y se
 * abren un momento con cada disparo.
 */
export class Crosshair {
  private readonly element: HTMLDivElement;
  private bloom = 0;
  private gap = -1;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'crosshair';
    for (const side of ['top', 'right', 'bottom', 'left']) {
      const bar = document.createElement('span');
      bar.className = `crosshair-bar crosshair-${side}`;
      this.element.appendChild(bar);
    }
    parent.appendChild(this.element);
  }

  /** Abre el punto de mira (disparo, retroceso). */
  pulse(amount: number): void {
    this.bloom = Math.min(this.bloom + amount, 1);
  }

  /** `spread` en radianes; `fov` vertical de la cámara en grados; `height` del canvas en píxeles. */
  update(dt: number, spread: number, fov: number, height: number, melee: boolean): void {
    this.bloom = Math.max(0, this.bloom - dt * 3.5);
    const pixelsPerRadian = height / 2 / Math.tan((fov * Math.PI) / 360);
    const gap = Math.round(melee ? 3 : 4 + spread * pixelsPerRadian + this.bloom * 14);
    if (gap !== this.gap) {
      this.gap = gap;
      this.element.style.setProperty('--gap', `${gap}px`);
    }
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }

  dispose(): void {
    this.element.remove();
  }
}
