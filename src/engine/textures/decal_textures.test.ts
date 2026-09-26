import { describe, expect, it } from 'vitest';
import { bulletHolePixels, scorchPixels } from './decal_textures';

describe('texturas de marcas de impacto', () => {
  it.each([
    ['agujero de bala', bulletHolePixels],
    ['quemadura', scorchPixels],
  ])('%s: centro opaco y esquinas transparentes', (_name, generate) => {
    const size = 32;
    const data = generate(size, 3);
    expect(data).toHaveLength(size * size * 4);
    const center = (16 * size + 16) * 4;
    expect(data[center + 3]).toBeGreaterThan(150);
    expect(data[3]).toBe(0);
    expect(data[(size * size - 1) * 4 + 3]).toBe(0);
  });
});
