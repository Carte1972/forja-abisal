import { describe, expect, it } from 'vitest';
import { SOUND_IDS, synthesize } from './synth';

const RATE = 22050;

describe('síntesis de sonidos', () => {
  it.each(SOUND_IDS)('%s: muestras finitas, sin saturar y audibles', (id) => {
    const data = synthesize(id, RATE);
    expect(data.length).toBeGreaterThan(RATE * 0.05);
    expect(data.length).toBeLessThan(RATE * 10);
    let peak = 0;
    let energy = 0;
    for (const v of data) {
      expect(Number.isFinite(v)).toBe(true);
      peak = Math.max(peak, Math.abs(v));
      energy += v * v;
    }
    expect(peak).toBeLessThanOrEqual(1);
    expect(peak).toBeGreaterThan(0.2);
    expect(Math.sqrt(energy / data.length)).toBeGreaterThan(0.01);
  });

  it('es determinista', () => {
    expect(synthesize('explosion', RATE)).toEqual(synthesize('explosion', RATE));
  });

  it('los efectos empiezan y acaban en silencio (sin chasquidos)', () => {
    for (const id of SOUND_IDS.filter((s) => s !== 'ambient')) {
      const data = synthesize(id, RATE);
      expect(Math.abs(data[0]!)).toBeLessThan(0.05);
      expect(Math.abs(data[data.length - 1]!)).toBeLessThan(0.05);
    }
  });

  it('el ambiente se repite sin salto entre el final y el principio', () => {
    const data = synthesize('ambient', RATE);
    expect(Math.abs(data[data.length - 1]! - data[0]!)).toBeLessThan(0.05);
  });
});
