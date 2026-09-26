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

/** Retroceso de la cámara al disparar: se suma a la vista y vuelve a su sitio enseguida. */
export class CameraKick {
  pitch = 0;
  yaw = 0;

  add(pitch: number, yaw: number): void {
    this.pitch = clamp(this.pitch + pitch, 0, 0.35);
    this.yaw = clamp(this.yaw + yaw, -0.1, 0.1);
  }

  update(dt: number): void {
    const decay = Math.exp(-dt * 9);
    this.pitch *= decay;
    this.yaw *= decay;
  }
}

/** Temblor de cámara (explosiones cercanas, golpes fuertes). */
export class CameraShake {
  private intensity = 0;
  private time = 0;

  add(amount: number): void {
    this.intensity = clamp(this.intensity + amount, 0, 1);
  }

  update(dt: number): void {
    this.time += dt;
    this.intensity = approach(this.intensity, 0, dt * 1.6);
  }

  /** Desplazamiento angular (radianes) en cabeceo y guiñada. */
  offset(): { pitch: number; yaw: number } {
    const k = this.intensity * this.intensity * 0.05;
    return {
      pitch: Math.sin(this.time * 47) * k + Math.sin(this.time * 23) * k * 0.5,
      yaw: Math.sin(this.time * 39 + 1.3) * k,
    };
  }
}
