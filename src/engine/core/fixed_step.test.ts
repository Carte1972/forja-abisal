import { describe, expect, it } from 'vitest';
import { FixedStepAccumulator } from './fixed_step';

const STEP = 1 / 60;

describe('FixedStepAccumulator', () => {
  it('no ejecuta pasos si no ha pasado un paso completo', () => {
    const acc = new FixedStepAccumulator(STEP);
    const result = acc.advance(STEP / 2);
    expect(result.steps).toBe(0);
    expect(result.alpha).toBeCloseTo(0.5);
  });

  it('acumula tiempo entre frames', () => {
    const acc = new FixedStepAccumulator(STEP);
    acc.advance(STEP * 0.6);
    const result = acc.advance(STEP * 0.6);
    expect(result.steps).toBe(1);
    expect(result.alpha).toBeCloseTo(0.2);
  });

  it('ejecuta varios pasos en un frame largo', () => {
    const acc = new FixedStepAccumulator(STEP);
    expect(acc.advance(STEP * 3.5).steps).toBe(3);
  });

  it('limita el tiempo de frame y el número de pasos', () => {
    const acc = new FixedStepAccumulator(STEP, 0.25, 8);
    const result = acc.advance(10);
    expect(result.steps).toBe(8);
    expect(result.alpha).toBeGreaterThanOrEqual(0);
    expect(result.alpha).toBeLessThan(1);
  });

  it('ignora tiempos negativos', () => {
    const acc = new FixedStepAccumulator(STEP);
    expect(acc.advance(-1).steps).toBe(0);
  });
});
