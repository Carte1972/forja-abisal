import { describe, expect, it } from 'vitest';
import { inViewCone, turnTowards, yawTowards } from './perception';

const EYE = { x: 0, y: 1.6, z: 0 };

describe('inViewCone', () => {
  it('ve lo que tiene delante (yaw 0 mira a -Z) y no lo que tiene detrás', () => {
    expect(inViewCone(EYE, 0, { x: 0, y: 1, z: -10 }, 120, 40)).toBe(true);
    expect(inViewCone(EYE, 0, { x: 0, y: 1, z: 10 }, 120, 40)).toBe(false);
  });

  it('respeta el ángulo del cono y la distancia máxima', () => {
    // 50° a la derecha: dentro de un cono de 120° (±60°), fuera de uno de 90° (±45°).
    const target = {
      x: Math.sin((50 * Math.PI) / 180) * 10,
      y: 1.6,
      z: -Math.cos((50 * Math.PI) / 180) * 10,
    };
    expect(inViewCone(EYE, 0, target, 120, 40)).toBe(true);
    expect(inViewCone(EYE, 0, target, 90, 40)).toBe(false);
    expect(inViewCone(EYE, 0, { x: 0, y: 1, z: -50 }, 120, 40)).toBe(false);
  });

  it('funciona con cualquier orientación', () => {
    const yaw = yawTowards(EYE, { x: 10, y: 0, z: 0 });
    expect(inViewCone(EYE, yaw, { x: 10, y: 0, z: 1 }, 60, 40)).toBe(true);
    expect(inViewCone(EYE, yaw, { x: -10, y: 0, z: 0 }, 60, 40)).toBe(false);
  });
});

describe('yawTowards y turnTowards', () => {
  it('yawTowards es coherente con la convención de la cámara', () => {
    expect(yawTowards(EYE, { x: 0, y: 0, z: -5 })).toBeCloseTo(0);
    expect(yawTowards(EYE, { x: -5, y: 0, z: 0 })).toBeCloseTo(Math.PI / 2);
  });

  it('turnTowards gira por el camino corto y no se pasa', () => {
    expect(turnTowards(0, 0.3, 0.1)).toBeCloseTo(0.1);
    expect(turnTowards(0, 0.05, 0.1)).toBeCloseTo(0.05);
    // De 170° a -170°: el camino corto cruza ±180°.
    const from = (170 * Math.PI) / 180;
    const to = (-170 * Math.PI) / 180;
    expect(turnTowards(from, to, 0.1)).toBeCloseTo(from + 0.1);
  });
});
