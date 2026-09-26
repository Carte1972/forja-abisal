import { describe, expect, it } from 'vitest';
import {
  applyEasing,
  blendAngles,
  interpolateScalar,
  lookAngles,
  sampleCameraPath,
  unwrapAngles,
  validateCameraPath,
  windowWeight,
  type CameraPath,
} from './camera_path';

const DEG = Math.PI / 180;

describe('recorridos de cámara', () => {
  it('el suavizado va de 0 a 1 y es simétrico en in-out', () => {
    for (const easing of ['linear', 'in', 'out', 'in-out'] as const) {
      expect(applyEasing(0, easing)).toBe(0);
      expect(applyEasing(1, easing)).toBe(1);
      expect(applyEasing(-1, easing)).toBe(0);
      expect(applyEasing(2, easing)).toBe(1);
    }
    expect(applyEasing(0.5, 'in-out')).toBeCloseTo(0.5);
    expect(applyEasing(0.25, 'in-out') + applyEasing(0.75, 'in-out')).toBeCloseTo(1);
  });

  it('la interpolación pasa por las claves y es continua entre tramos', () => {
    const times = [0, 1, 3, 4];
    const values = [0, 10, 5, 8];
    times.forEach((t, i) => expect(interpolateScalar(times, values, t)).toBeCloseTo(values[i]!));
    // Sin saltos a ambos lados de una clave intermedia.
    const eps = 1e-4;
    expect(interpolateScalar(times, values, 1 - eps)).toBeCloseTo(
      interpolateScalar(times, values, 1 + eps),
      2,
    );
    // Velocidad continua en la clave (derivadas numéricas a izquierda y derecha).
    const left =
      (interpolateScalar(times, values, 1) - interpolateScalar(times, values, 1 - eps)) / eps;
    const right =
      (interpolateScalar(times, values, 1 + eps) - interpolateScalar(times, values, 1)) / eps;
    expect(left).toBeCloseTo(right, 1);
  });

  it('fuera del recorrido se queda en la primera o la última clave', () => {
    expect(interpolateScalar([1, 2], [3, 7], 0)).toBe(3);
    expect(interpolateScalar([1, 2], [3, 7], 5)).toBe(7);
  });

  it('una trayectoria recta a velocidad lineal avanza de forma uniforme', () => {
    const path: CameraPath = {
      easing: 'linear',
      keys: [
        { t: 0, pos: [0, 1, 0], yaw: 0 },
        { t: 2, pos: [10, 1, 0], yaw: 0 },
      ],
    };
    expect(sampleCameraPath(path, 0.5).pos!.x).toBeCloseTo(2.5);
    expect(sampleCameraPath(path, 1).pos!.x).toBeCloseTo(5);
    expect(sampleCameraPath(path, 1).pos!.y).toBeCloseTo(1);
  });

  it('con in-out arranca y frena suave', () => {
    const path: CameraPath = {
      keys: [
        { t: 0, pos: [0, 0, 0], yaw: 0 },
        { t: 1, pos: [1, 0, 0], yaw: 0 },
      ],
    };
    const start = sampleCameraPath(path, 0.05).pos!.x;
    const middle = sampleCameraPath(path, 0.55).pos!.x - sampleCameraPath(path, 0.5).pos!.x;
    expect(start).toBeLessThan(0.05);
    expect(middle).toBeGreaterThan(0.05);
  });

  it('los ángulos giran por el camino corto', () => {
    const unwrapped = unwrapAngles([170 * DEG, -170 * DEG]);
    expect(unwrapped[1]! - unwrapped[0]!).toBeCloseTo(20 * DEG);
    const path: CameraPath = {
      easing: 'linear',
      keys: [
        { t: 0, pos: [0, 0, 0], yaw: 170 },
        { t: 1, pos: [0, 0, 0], yaw: -170 },
      ],
    };
    const yaw = sampleCameraPath(path, 0.5).yaw;
    expect(Math.abs(Math.atan2(Math.sin(yaw), Math.cos(yaw)))).toBeCloseTo(Math.PI);
  });

  it('mirar a un punto sigue el convenio del juego: yaw 0 al norte, 90 al oeste', () => {
    const origin = { x: 0, y: 0, z: 0 };
    expect(lookAngles(origin, { x: 0, y: 0, z: -5 }).yaw).toBeCloseTo(0);
    expect(lookAngles(origin, { x: -5, y: 0, z: 0 }).yaw).toBeCloseTo(90 * DEG);
    expect(lookAngles(origin, { x: 0, y: 5, z: -5 }).pitch).toBeCloseTo(45 * DEG);
    const path: CameraPath = {
      keys: [
        { t: 0, pos: [0, 0, 0], look: [0, 0, -5] },
        { t: 1, pos: [0, 0, 0], look: [-5, 0, 0] },
      ],
    };
    expect(sampleCameraPath(path, 1).yaw).toBeCloseTo(90 * DEG);
    // Con el ojo del jugador, la orientación se calcula desde él.
    const sample = sampleCameraPath({ keys: [{ t: 0, look: [3, 0, 0] }] }, 0, { x: 0, y: 0, z: 0 });
    expect(sample.pos).toBeNull();
    expect(sample.yaw).toBeCloseTo(-90 * DEG);
  });

  it('valida los recorridos', () => {
    expect(validateCameraPath({ keys: [] }, true)).toHaveLength(1);
    expect(validateCameraPath({ keys: [{ t: 0, yaw: 0 }] }, true)[0]).toContain('pos');
    expect(
      validateCameraPath(
        {
          keys: [
            { t: 1, pos: [0, 0, 0], yaw: 0 },
            { t: 1, pos: [0, 0, 0], look: [0, 0, 1] },
          ],
        },
        true,
      ).length,
    ).toBeGreaterThanOrEqual(2);
    expect(validateCameraPath({ keys: [{ t: 0, yaw: 10, pitch: 5 }] }, false)).toEqual([]);
  });

  it('mezcla orientaciones por el camino corto', () => {
    const a = { yaw: 170 * DEG, pitch: 0 };
    const b = { yaw: -170 * DEG, pitch: 10 * DEG };
    const half = blendAngles(a, b, 0.5);
    expect(Math.abs(Math.atan2(Math.sin(half.yaw), Math.cos(half.yaw)))).toBeCloseTo(Math.PI);
    expect(half.pitch).toBeCloseTo(5 * DEG);
    expect(blendAngles(a, b, 0).yaw).toBeCloseTo(a.yaw);
  });

  it('el peso de un intervalo entra y sale suave', () => {
    expect(windowWeight(0.9, 1, 2, 0.2)).toBe(0);
    expect(windowWeight(1.1, 1, 2, 0.2)).toBeCloseTo(0.5);
    expect(windowWeight(1.5, 1, 2, 0.2)).toBe(1);
    expect(windowWeight(2.1, 1, 2, 0.2)).toBeCloseTo(0.5);
    expect(windowWeight(2.3, 1, 2, 0.2)).toBe(0);
  });
});
