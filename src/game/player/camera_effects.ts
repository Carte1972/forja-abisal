import { approach, clamp } from '../../engine/core/math_utils';

/** Balanceo de cámara al andar: la intensidad depende de la velocidad y solo en el suelo. */
export class HeadBob {
  private phase = 0;
  private intensity = 0;

  update(horizontalSpeed: number, grounded: boolean, referenceSpeed: number, dt: number): void {
    const target = grounded ? clamp(horizontalSpeed / referenceSpeed, 0, 1.2) : 0;
    this.intensity = approach(this.intensity, target, dt * 4);
    this.phase += dt * (4 + horizontalSpeed * 0.9);
  }

  /** Desplazamiento lateral (x) y vertical (y) en metros. */
  offset(enabled: boolean): { x: number; y: number } {
    if (!enabled) return { x: 0, y: 0 };
    return {
      x: Math.cos(this.phase) * 0.035 * this.intensity,
      y: Math.sin(this.phase * 2) * 0.045 * this.intensity,
    };
  }
}

/** Hundimiento breve de la cámara al aterrizar, proporcional a la velocidad de caída. */
export class LandingDip {
  private offsetY = 0;
  private velocityY = 0;

  land(impactSpeed: number): void {
    if (impactSpeed < 4) return;
    this.velocityY -= Math.min(impactSpeed * 0.12, 3);
  }

  update(dt: number): void {
    // Muelle amortiguado que devuelve la cámara a su sitio.
    const stiffness = 90;
    const damping = 14;
    this.velocityY += (-stiffness * this.offsetY - damping * this.velocityY) * dt;
    this.offsetY = clamp(this.offsetY + this.velocityY * dt, -0.35, 0.1);
  }

  get offset(): number {
    return this.offsetY;
  }
}
