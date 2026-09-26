export type Rgb = readonly [number, number, number];

/** Imagen RGBA cuadrada en memoria. Se vuelca a un canvas con putImageData. */
export class PixelBuffer {
  readonly data: Uint8ClampedArray;

  constructor(readonly size: number) {
    this.data = new Uint8ClampedArray(size * size * 4);
  }

  /** Coordenadas con envoltura: las texturas se repiten sin costuras. */
  private index(x: number, y: number): number {
    const s = this.size;
    const wx = ((Math.floor(x) % s) + s) % s;
    const wy = ((Math.floor(y) % s) + s) % s;
    return (wy * s + wx) * 4;
  }

  set(x: number, y: number, color: Rgb): void {
    const i = this.index(x, y);
    this.data[i] = color[0];
    this.data[i + 1] = color[1];
    this.data[i + 2] = color[2];
    this.data[i + 3] = 255;
  }

  get(x: number, y: number): Rgb {
    const i = this.index(x, y);
    return [this.data[i]!, this.data[i + 1]!, this.data[i + 2]!];
  }

  fill(color: Rgb): void {
    for (let y = 0; y < this.size; y++) for (let x = 0; x < this.size; x++) this.set(x, y, color);
  }

  fillRect(x0: number, y0: number, w: number, h: number, color: Rgb): void {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, color);
  }

  /** Aplica una función a cada píxel (recibe el color actual y devuelve el nuevo). */
  map(fn: (x: number, y: number, color: Rgb) => Rgb): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) this.set(x, y, fn(x, y, this.get(x, y)));
    }
  }

  /** Luminancia de cada píxel en [0, 1]. */
  luminance(): Float32Array {
    const out = new Float32Array(this.size * this.size);
    for (let i = 0; i < out.length; i++) {
      const r = this.data[i * 4]!;
      const g = this.data[i * 4 + 1]!;
      const b = this.data[i * 4 + 2]!;
      out[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }
    return out;
  }
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function shade(color: Rgb, factor: number): Rgb {
  return [color[0] * factor, color[1] * factor, color[2] * factor];
}
