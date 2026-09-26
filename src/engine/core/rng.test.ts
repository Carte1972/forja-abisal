import { describe, expect, it } from 'vitest';
import { hash2, hashString, Rng } from './rng';

describe('Rng', () => {
  it('es determinista para la misma semilla', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(new Rng(43).next()).not.toBe(seqA[0]);
  });

  it('genera valores dentro de rango', () => {
    const rng = new Rng(1);
    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      const n = rng.int(2, 4);
      expect([2, 3, 4]).toContain(n);
    }
  });

  it('hashString y hash2 son estables', () => {
    expect(hashString('brick')).toBe(hashString('brick'));
    expect(hashString('brick')).not.toBe(hashString('stone'));
    expect(hash2(3, 4, 7)).toBe(hash2(3, 4, 7));
    expect(hash2(3, 4, 7)).toBeLessThan(1);
  });
});
