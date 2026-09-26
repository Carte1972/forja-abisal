import { describe, expect, it } from 'vitest';
import { normalMapFromHeight } from './normal_map';
import { fbm, fbmAniso, valueNoise, voronoi } from './noise';

const SIZE = 8;

describe('normalMapFromHeight', () => {
  it('una superficie plana da la normal (128, 128, 255)', () => {
    const out = normalMapFromHeight(new Float32Array(SIZE * SIZE).fill(0.5), SIZE, 2);
    expect(Math.abs(out[0]! - 127.5)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(out[1]! - 127.5)).toBeLessThanOrEqual(0.5);
    expect(out[2]).toBe(255);
  });

  it('una pendiente que sube hacia +X inclina la normal hacia -X', () => {
    const height = new Float32Array(SIZE * SIZE);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) height[y * SIZE + x] = x / SIZE;
    const out = normalMapFromHeight(height, SIZE, 2);
    const i = (4 * SIZE + 4) * 4;
    expect(out[i]!).toBeLessThan(120);
    expect(Math.abs(out[i + 1]! - 127.5)).toBeLessThanOrEqual(0.5);
  });
});

describe('ruido periódico', () => {
  it('valueNoise se repite con el periodo', () => {
    expect(valueNoise(0.3, 0.7, 4, 2, 9)).toBeCloseTo(valueNoise(4.3, 2.7, 4, 2, 9), 10);
  });

  it('fbm está en [0, 1] y se repite con el tamaño de la textura', () => {
    for (let i = 0; i < 50; i++) {
      const v = fbm(i * 1.3, i * 2.1, 64, 4, 4, 3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(fbm(5, 9, 64, 4, 3, 1)).toBeCloseTo(fbm(5 + 64, 9 + 64, 64, 4, 3, 1), 10);
    expect(fbmAniso(5, 9, 64, 2, 16, 3, 1)).toBeCloseTo(
      fbmAniso(5 + 64, 9 + 64, 64, 2, 16, 3, 1),
      10,
    );
  });

  it('voronoi es periódico y d1 <= d2', () => {
    const a = voronoi(10, 20, 64, 4, 5);
    const b = voronoi(10 + 64, 20, 64, 4, 5);
    expect(a.d1).toBeCloseTo(b.d1, 10);
    expect(a.id).toBe(b.id);
    expect(a.d1).toBeLessThanOrEqual(a.d2);
  });
});
