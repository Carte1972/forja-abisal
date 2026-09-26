import { describe, expect, it } from 'vitest';
import { parseLevel } from '../level/level_parser';
import testLevel from '../../levels/test_level.json';
import { generateTexture, hasTexture, TEXTURE_CATALOG, TEXTURE_SIZE } from './texture_catalog';

/** Diferencia media de luminancia entre dos columnas (o filas) de píxeles. */
function edgeDifference(
  data: Uint8ClampedArray,
  size: number,
  a: (i: number) => number,
  b: (i: number) => number,
): number {
  let total = 0;
  for (let i = 0; i < size; i++) {
    const pa = a(i) * 4;
    const pb = b(i) * 4;
    total += Math.abs(data[pa]! - data[pb]!) + Math.abs(data[pa + 1]! - data[pb + 1]!);
  }
  return total / size;
}

describe('catálogo de texturas', () => {
  const names = Object.keys(TEXTURE_CATALOG);

  it.each(names)('%s genera una imagen opaca del tamaño correcto y determinista', (name) => {
    const a = generateTexture(name);
    const b = generateTexture(name);
    expect(a.albedo.data).toHaveLength(TEXTURE_SIZE * TEXTURE_SIZE * 4);
    expect(a.albedo.data).toEqual(b.albedo.data);
    for (let i = 3; i < a.albedo.data.length; i += 4) expect(a.albedo.data[i]).toBe(255);
    if (a.emissive) expect(a.emissive.data).toHaveLength(a.albedo.data.length);
  });

  // "missing" es un damero y "lift_top" lleva un marco de franjas pensado para una sola
  // baldosa (el ascensor mide 2×2 m): su borde tiene más contraste que el interior a propósito.
  it.each(names.filter((n) => n !== 'missing' && n !== 'lift_top'))(
    '%s se repite sin costuras (el borde no es más brusco que el interior)',
    (name) => {
      const { data } = generateTexture(name).albedo;
      const s = TEXTURE_SIZE;
      const seam =
        edgeDifference(
          data,
          s,
          (i) => i * s + (s - 1),
          (i) => i * s,
        ) +
        edgeDifference(
          data,
          s,
          (i) => (s - 1) * s + i,
          (i) => i,
        );
      let interior = 0;
      for (const c of [15, 31, 47]) {
        interior += edgeDifference(
          data,
          s,
          (i) => i * s + c,
          (i) => i * s + c + 1,
        );
        interior += edgeDifference(
          data,
          s,
          (i) => c * s + i,
          (i) => (c + 1) * s + i,
        );
      }
      // Las juntas de ladrillos o paneles caen en el borde a propósito: se admite margen.
      expect(seam / 2).toBeLessThan((interior / 6) * 3 + 20);
    },
  );

  it('los nombres desconocidos usan la textura "missing"', () => {
    expect(hasTexture('no_existe')).toBe(false);
    expect(generateTexture('no_existe').albedo.data).toEqual(
      generateTexture('missing').albedo.data,
    );
  });

  it('todas las texturas del nivel de pruebas existen en el catálogo', () => {
    const level = parseLevel(testLevel);
    const used = new Set<string>();
    for (const s of level.sectors) {
      used.add(s.floor.texture);
      if (!s.sky) used.add(s.ceiling.texture);
      used.add(s.walls.middle).add(s.walls.upper).add(s.walls.lower);
      if (s.special?.type === 'door' || s.special?.type === 'lift') used.add(s.special.texture);
    }
    for (const slab of level.slabs) {
      used.add(slab.textures.top).add(slab.textures.bottom).add(slab.textures.side);
    }
    expect([...used].filter((name) => !hasTexture(name))).toEqual([]);
  });
});
