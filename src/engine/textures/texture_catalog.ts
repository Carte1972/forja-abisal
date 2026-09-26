import { hash2, hashString, Rng } from '../core/rng';
import { fbm, fbmAniso, voronoi } from './noise';
import { mix, PixelBuffer, shade, type Rgb } from './pixel_buffer';

/**
 * Catálogo de texturas procedurales. Cada generador es una función pura que pinta un
 * PixelBuffer de `size`×`size` a partir de una semilla; todas se repiten sin costuras.
 * Todo el diseño es original.
 */

export const TEXTURE_SIZE = 64;

export interface GeneratedTexture {
  albedo: PixelBuffer;
  /** Zonas que brillan por sí mismas (negro = nada). */
  emissive?: PixelBuffer;
}

export interface TextureDef {
  generate(size: number, seed: number): GeneratedTexture;
  roughness: number;
  metalness: number;
  /** Intensidad del relieve del normal map derivado de la luminancia (0 = sin normal map). */
  normalStrength: number;
  /** Multiplicador del mapa emisivo; por encima de 1 activa el bloom. */
  emissiveIntensity?: number;
  /** Superficies con emisivo animado (lava, ácido). */
  flowing?: boolean;
}

const BLACK: Rgb = [0, 0, 0];

/** Variación de brillo por píxel, estable para cada coordenada. */
function grain(x: number, y: number, seed: number, amount: number): number {
  return 1 + (hash2(x, y, seed) - 0.5) * amount;
}

function brick(size: number, seed: number): GeneratedTexture {
  const img = new PixelBuffer(size);
  const bw = 16;
  const bh = 8;
  const bricksPerRow = size / bw;
  img.map((x, y) => {
    const row = Math.floor(y / bh);
    const offset = (row % 2) * (bw / 2);
    const lx = (x + offset) % bw;
    const ly = y % bh;
    const noise = 0.8 + 0.35 * fbm(x, y, size, 8, 3, seed);
    if (lx === 0 || ly === 0) return shade([62, 56, 50], noise * grain(x, y, seed, 0.2));
    const bx = Math.floor((x + offset) / bw) % bricksPerRow;
    let color = mix([112, 48, 36], [156, 82, 54], hash2(bx, row, seed));
    if (ly === 1) color = shade(color, 1.18);
    if (ly === bh - 1) color = shade(color, 0.78);
    if (lx === 1) color = shade(color, 1.08);
    if (lx === bw - 1) color = shade(color, 0.84);
    return shade(color, noise * grain(x, y, seed + 1, 0.12));
  });
  return { albedo: img };
}

function stoneFloor(size: number, seed: number): GeneratedTexture {
  const img = new PixelBuffer(size);
  img.map((x, y) => {
    const { d1, d2, id } = voronoi(x + 0.5, y + 0.5, size, 4, seed);
    const edge = d2 - d1;
    const noise = 0.78 + 0.4 * fbm(x, y, size, 8, 3, seed + 3);
    if (edge < 1.4) return shade([38, 36, 34], grain(x, y, seed, 0.3));
    let color = mix([88, 84, 78], [126, 118, 106], hash2(id, 0, seed));
    if (edge < 2.6) color = shade(color, 0.82);
    const crack = Math.abs(fbm(x, y, size, 4, 4, seed + 9) - 0.5) < 0.012;
    return shade(color, noise * (crack ? 0.6 : 1) * grain(x, y, seed + 2, 0.1));
  });
  return { albedo: img };
}

function stoneStep(size: number, seed: number): GeneratedTexture {
  const img = new PixelBuffer(size);
  img.map((x, y) => {
    const streak = fbmAniso(x, y, size, 2, 16, 3, seed);
    const color = mix([96, 90, 82], [134, 126, 114], streak);
    const band = y % 16 === 0 ? 0.7 : y % 16 === 1 ? 1.15 : 1;
    return shade(color, band * grain(x, y, seed, 0.14));
  });
  return { albedo: img };
}

function metalFloor(size: number, seed: number): GeneratedTexture {
  const img = new PixelBuffer(size);
  img.map((x, y) => {
    const base = shade([94, 98, 104], 0.88 + 0.22 * fbm(x, y, size, 4, 3, seed));
    const cx = Math.floor(x / 8);
    const cy = Math.floor(y / 8);
    const lx = (x % 8) - 3.5;
    const ly = (y % 8) - 3.5;
    // Relieve en diagonal alterna, como una chapa antideslizante.
    const flip = (cx + cy) % 2 === 0 ? 1 : -1;
    const u = (lx + flip * ly) / Math.SQRT2;
    const v = (lx - flip * ly) / Math.SQRT2;
    if (Math.abs(u) < 3 && Math.abs(v) < 0.8) return shade(base, v * flip < 0 ? 1.3 : 0.95);
    return shade(base, grain(x, y, seed, 0.08));
  });
  return { albedo: img };
}

function metalCeiling(size: number, seed: number): GeneratedTexture {
  const img = new PixelBuffer(size);
  const panel = 32;
  img.map((x, y) => {
    const px = x % panel;
    const py = y % panel;
    if (px === 0 || py === 0) return [28, 30, 34];
    let color = shade([74, 78, 86], 0.85 + 0.25 * fbmAniso(x, y, size, 16, 2, 3, seed));
    if (px === 1 || py === 1) color = shade(color, 1.2);
    if (px === panel - 1 || py === panel - 1) color = shade(color, 0.75);
    for (const [rx, ry] of [
      [4, 4],
      [27, 4],
      [4, 27],
      [27, 27],
    ] as const) {
      const d = Math.hypot(px - rx, py - ry);
      if (d < 1.1) return shade(color, 1.45);
      if (d < 2) return shade(color, 0.7);
    }
    return shade(color, grain(x, y, seed, 0.06));
  });
  return { albedo: img };
}

function metalGrate(size: number, seed: number): GeneratedTexture {
  const img = new PixelBuffer(size);
  img.map((x, y) => {
    const bx = x % 8;
    const by = y % 8;
    const rust = fbm(x, y, size, 4, 3, seed);
    const metal = mix([112, 114, 120], [120, 84, 60], Math.max(0, rust - 0.55) * 2);
    const onX = bx < 2;
    const onY = by < 2;
    if (onX && onY) return shade(metal, 1.25);
    if (onX) return shade(metal, bx === 0 ? 1.15 : 0.8);
    if (onY) return shade(metal, by === 0 ? 1.15 : 0.8);
    return shade([16, 16, 18], grain(x, y, seed, 0.4));
  });
  return { albedo: img };
}

function techWall(size: number, seed: number): GeneratedTexture {
  const img = new PixelBuffer(size);
  const emissive = new PixelBuffer(size);
  emissive.fill(BLACK);
  const strip: Rgb = [70, 220, 255];
  img.map((x, y) => {
    const px = x % 32;
    let color = shade([50, 56, 68], 0.85 + 0.25 * fbm(x, y, size, 4, 3, seed));
    if (px === 0 || y === 0) return [22, 24, 30];
    if (px === 1 || y === 1) color = shade(color, 1.25);
    if (px === 31 || y === size - 1) color = shade(color, 0.72);
    const inStrip = y >= 44 && y <= 45 && px >= 6 && px <= 25;
    if (inStrip) {
      emissive.set(x, y, strip);
      return strip;
    }
    if (y === 43 || y === 46) {
      if (px >= 5 && px <= 26) return [20, 22, 28];
    }
    // Pilotos de estado.
    if (y >= 10 && y <= 11 && (px === 7 || px === 8 || px === 11 || px === 12)) {
      const led: Rgb = px < 10 ? [80, 255, 120] : [255, 90, 60];
      emissive.set(x, y, led);
      return led;
    }
    return shade(color, grain(x, y, seed, 0.08));
  });
  return { albedo: img, emissive };
}

function techPanel(size: number, seed: number): GeneratedTexture {
  const img = new PixelBuffer(size);
  const emissive = new PixelBuffer(size);
  img.map((x, y) => shade([28, 34, 38], 0.85 + 0.3 * fbm(x, y, size, 4, 2, seed)));
  emissive.fill(BLACK);
  const rng = new Rng(seed);
  const trace: Rgb = [60, 150, 126];
  const pad: Rgb = [190, 160, 80];
  for (let t = 0; t < 14; t++) {
    let x = rng.int(0, size / 4 - 1) * 4;
    let y = rng.int(0, size / 4 - 1) * 4;
    let horizontal = rng.next() < 0.5;
    for (let segment = 0; segment < 4; segment++) {
      const length = rng.int(2, 5) * 4;
      const dir = rng.next() < 0.5 ? -1 : 1;
      for (let i = 0; i < length; i++) {
        img.set(x, y, trace);
        emissive.set(x, y, shade(trace, 0.6));
        if (horizontal) x += dir;
        else y += dir;
      }
      horizontal = !horizontal;
    }
    img.fillRect(x - 1, y - 1, 3, 3, pad);
  }
  return { albedo: img, emissive };
}

function hazardStripe(x: number, y: number): Rgb {
  return Math.floor((x + y) / 4) % 2 === 0 ? [214, 164, 32] : [26, 22, 20];
}

function doorMetal(size: number, seed: number): GeneratedTexture {
  const img = new PixelBuffer(size);
  img.map((x, y) => {
    if (y >= size - 8) return shade(hazardStripe(x, y), grain(x, y, seed, 0.15));
    let color = shade([100, 106, 114], 0.88 + 0.18 * fbmAniso(x, y, size, 8, 2, 3, seed));
    const ry = y % 16;
    if (ry === 0) color = shade(color, 0.55);
    else if (ry === 1) color = shade(color, 1.2);
    else if (ry === 15) color = shade(color, 0.8);
    if (x === size / 2 - 1) return [24, 24, 28];
    if (x === size / 2) color = shade(color, 1.25);
    if ((x === 6 || x === size - 7) && ry === 8) return shade(color, 1.5);
    return shade(color, grain(x, y, seed, 0.06));
  });
  return { albedo: img };
}

function doorFrame(size: number, seed: number): GeneratedTexture {
  const img = new PixelBuffer(size);
  img.map((x, y) => {
    let color = shade([58, 60, 66], 0.85 + 0.25 * fbm(x, y, size, 4, 3, seed));
    const gx = x % 8;
    if (gx === 0) color = shade(color, 0.6);
    if (gx === 1) color = shade(color, 1.2);
    if (gx === 4 && y % 16 === 8) return shade(color, 1.6);
    return shade(color, grain(x, y, seed, 0.08));
  });
  return { albedo: img };
}

function liftTop(size: number, seed: number): GeneratedTexture {
  const img = new PixelBuffer(size);
  const half = size / 2;
  img.map((x, y) => {
    if (x < 4 || y < 4 || x >= size - 4 || y >= size - 4) return hazardStripe(x, y);
    const base = shade([86, 90, 84], 0.88 + 0.2 * fbm(x, y, size, 4, 3, seed));
    const dx = Math.abs(x + 0.5 - half);
    const phase = (y - 16 - dx * 0.6) % 12;
    if (dx < 14 && y >= 16 && y < 52 && phase >= 0 && phase < 4) return [220, 176, 40];
    return shade(base, grain(x, y, seed, 0.08));
  });
  return { albedo: img };
}

function rock(size: number, seed: number): GeneratedTexture {
  const img = new PixelBuffer(size);
  img.map((x, y) => {
    const f = fbm(x, y, size, 4, 5, seed);
    let color = mix([66, 60, 54], [132, 120, 104], f);
    const ridge = 1 - Math.abs(2 * fbm(x, y, size, 3, 4, seed + 5) - 1);
    if (ridge > 0.965) color = shade(color, 0.72);
    return shade(color, grain(x, y, seed, 0.16));
  });
  return { albedo: img };
}

function dirt(size: number, seed: number): GeneratedTexture {
  const img = new PixelBuffer(size);
  img.map((x, y) => {
    const f = fbm(x, y, size, 4, 4, seed);
    let color = mix([70, 52, 38], [112, 86, 60], f);
    const { d1 } = voronoi(x + 0.5, y + 0.5, size, 8, seed + 3);
    if (d1 < 1.6) color = mix(color, [140, 128, 112], 0.6);
    else if (d1 < 2.2) color = shade(color, 0.75);
    return shade(color, grain(x, y, seed, 0.22));
  });
  return { albedo: img };
}

/** Magma o ácido: costra oscura con vetas brillantes que solo emiten en las zonas calientes. */
function molten(crust: Rgb, hot: Rgb, bright: Rgb) {
  return (size: number, seed: number): GeneratedTexture => {
    const img = new PixelBuffer(size);
    const emissive = new PixelBuffer(size);
    img.map((x, y) => {
      const f = fbm(x, y, size, 3, 5, seed);
      const glow = f < 0.45 ? 0 : (f - 0.45) / 0.55;
      const color = f < 0.45 ? mix(crust, hot, (f / 0.45) ** 3) : mix(hot, bright, glow);
      emissive.set(x, y, f < 0.42 ? BLACK : color);
      return color;
    });
    return { albedo: img, emissive };
  };
}

function missing(size: number): GeneratedTexture {
  const img = new PixelBuffer(size);
  img.map((x, y) =>
    (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? [255, 0, 255] : [20, 0, 20],
  );
  return { albedo: img };
}

export const TEXTURE_CATALOG: Readonly<Record<string, TextureDef>> = {
  brick: { generate: brick, roughness: 0.92, metalness: 0, normalStrength: 2.5 },
  stone_floor: { generate: stoneFloor, roughness: 0.9, metalness: 0, normalStrength: 2 },
  stone_step: { generate: stoneStep, roughness: 0.88, metalness: 0, normalStrength: 1.5 },
  metal_floor: { generate: metalFloor, roughness: 0.55, metalness: 0.3, normalStrength: 3 },
  metal_ceiling: { generate: metalCeiling, roughness: 0.6, metalness: 0.25, normalStrength: 2 },
  metal_grate: { generate: metalGrate, roughness: 0.5, metalness: 0.35, normalStrength: 3 },
  tech_wall: {
    generate: techWall,
    roughness: 0.55,
    metalness: 0.25,
    normalStrength: 2,
    emissiveIntensity: 3,
  },
  tech_panel: {
    generate: techPanel,
    roughness: 0.5,
    metalness: 0.2,
    normalStrength: 1.5,
    emissiveIntensity: 1.5,
  },
  door_metal: { generate: doorMetal, roughness: 0.5, metalness: 0.35, normalStrength: 2.5 },
  door_frame: { generate: doorFrame, roughness: 0.6, metalness: 0.3, normalStrength: 2 },
  lift_top: { generate: liftTop, roughness: 0.6, metalness: 0.25, normalStrength: 1.5 },
  rock: { generate: rock, roughness: 0.95, metalness: 0, normalStrength: 3 },
  dirt: { generate: dirt, roughness: 1, metalness: 0, normalStrength: 2 },
  lava: {
    generate: molten([36, 14, 10], [200, 52, 12], [255, 206, 70]),
    roughness: 0.8,
    metalness: 0,
    normalStrength: 2,
    emissiveIntensity: 2.6,
    flowing: true,
  },
  acid: {
    generate: molten([16, 34, 12], [60, 190, 40], [200, 255, 120]),
    roughness: 0.6,
    metalness: 0,
    normalStrength: 1.5,
    emissiveIntensity: 2.2,
    flowing: true,
  },
  missing: { generate: missing, roughness: 1, metalness: 0, normalStrength: 0 },
};

export function hasTexture(name: string): boolean {
  return Object.hasOwn(TEXTURE_CATALOG, name);
}

/** Genera una textura del catálogo; los nombres desconocidos dan el damero de "missing". */
export function generateTexture(name: string, size = TEXTURE_SIZE): GeneratedTexture {
  const def = TEXTURE_CATALOG[name] ?? TEXTURE_CATALOG.missing!;
  return def.generate(size, hashString(name));
}
