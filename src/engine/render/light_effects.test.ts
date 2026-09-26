import { describe, expect, it } from 'vitest';
import {
  flashFalloff,
  flickerFactor,
  FLICKER_MODES,
  selectLamps,
  type LampCandidate,
} from './light_effects';

describe('flickerFactor', () => {
  it.each(FLICKER_MODES)('%s se mantiene entre 0 y 1 y es determinista', (mode) => {
    for (let t = 0; t < 10; t += 0.037) {
      const value = flickerFactor(mode, t, 12);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      expect(flickerFactor(mode, t, 12)).toBe(value);
    }
  });

  it('steady siempre vale 1', () => {
    expect(flickerFactor('steady', 3.3, 5)).toBe(1);
  });

  it('strobe alterna entre encendido y casi apagado', () => {
    const values = new Set<number>();
    for (let t = 0; t < 2; t += 0.05) values.add(flickerFactor('strobe', t, 0));
    expect(values).toEqual(new Set([1, 0.08]));
  });

  it('broken tiene apagones, pero pasa la mayor parte del tiempo encendida', () => {
    let off = 0;
    const samples = 2000;
    for (let i = 0; i < samples; i++) if (flickerFactor('broken', i / 60, 7) < 0.1) off++;
    expect(off).toBeGreaterThan(0);
    expect(off / samples).toBeLessThan(0.35);
  });
});

describe('flashFalloff', () => {
  it('empieza en 1 y se apaga al acabar la duración', () => {
    expect(flashFalloff(0, 0.1)).toBe(1);
    expect(flashFalloff(0.05, 0.1)).toBeCloseTo(0.25);
    expect(flashFalloff(0.1, 0.1)).toBe(0);
  });
});

describe('selectLamps', () => {
  const lamp = (x: number, shadows = false, radius = 5): LampCandidate => ({
    x,
    y: 0,
    z: 0,
    radius,
    shadows,
  });
  const origin = { x: 0, y: 0, z: 0 };

  it('elige las lámparas más cercanas hasta llenar los huecos', () => {
    const lamps = [lamp(30), lamp(2), lamp(10), lamp(5)];
    expect(selectLamps(lamps, origin, 2, 0).plain).toEqual([1, 3]);
  });

  it('reserva los huecos con sombra para lámparas con sombra', () => {
    const lamps = [lamp(2), lamp(8, true), lamp(12, true), lamp(3)];
    const result = selectLamps(lamps, origin, 3, 1);
    expect(result.shadowed).toEqual([1]);
    expect(result.plain).toEqual([0, 3]);
  });

  it('una lámpara con sombra que no cabe en su hueco puede ocupar uno normal', () => {
    const lamps = [lamp(2, true), lamp(3, true)];
    expect(selectLamps(lamps, origin, 2, 1)).toEqual({ shadowed: [0], plain: [1] });
  });

  it('ignora las lámparas cuya luz no alcanza', () => {
    expect(selectLamps([lamp(100)], origin, 4, 0).plain).toEqual([]);
  });

  it('una lámpara grande pesa más que una pequeña a la misma distancia', () => {
    const lamps = [lamp(10, false, 3), lamp(10, false, 12)];
    expect(selectLamps(lamps, origin, 1, 0).plain).toEqual([1]);
  });
});
