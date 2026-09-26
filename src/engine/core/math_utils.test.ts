import { describe, expect, it } from 'vitest';
import { approach, clamp, lerp } from './math_utils';

describe('math_utils', () => {
  it('clamp limita al rango', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it('lerp interpola linealmente', () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5);
  });

  it('approach no se pasa del objetivo', () => {
    expect(approach(0, 1, 0.3)).toBeCloseTo(0.3);
    expect(approach(0.9, 1, 0.3)).toBe(1);
    expect(approach(1, 0, 0.3)).toBeCloseTo(0.7);
  });
});
