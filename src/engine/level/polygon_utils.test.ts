import { describe, expect, it } from 'vitest';
import {
  isConvex,
  isSimplePolygon,
  pointInPolygon,
  pointOnSegmentInterior,
  segmentsIntersect,
  signedArea,
} from './polygon_utils';
import type { Point2 } from './level_types';

const SQUARE: Point2[] = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
];

describe('polygon_utils', () => {
  it('signedArea cambia de signo con la orientación', () => {
    expect(signedArea(SQUARE)).toBe(16);
    expect(signedArea([...SQUARE].reverse())).toBe(-16);
  });

  it('pointInPolygon distingue dentro y fuera', () => {
    expect(pointInPolygon(2, 2, SQUARE)).toBe(true);
    expect(pointInPolygon(5, 2, SQUARE)).toBe(false);
  });

  it('pointOnSegmentInterior excluye los extremos', () => {
    expect(pointOnSegmentInterior([2, 0], [0, 0], [4, 0])).toBe(true);
    expect(pointOnSegmentInterior([0, 0], [0, 0], [4, 0])).toBe(false);
    expect(pointOnSegmentInterior([2, 0.1], [0, 0], [4, 0])).toBe(false);
  });

  it('segmentsIntersect detecta cruces y toques', () => {
    expect(segmentsIntersect([0, 0], [4, 4], [0, 4], [4, 0])).toBe(true);
    expect(segmentsIntersect([0, 0], [4, 0], [0, 1], [4, 1])).toBe(false);
    expect(segmentsIntersect([0, 0], [4, 0], [2, 0], [2, 3])).toBe(true);
  });

  it('isSimplePolygon rechaza la pajarita', () => {
    expect(isSimplePolygon(SQUARE)).toBe(true);
    expect(
      isSimplePolygon([
        [0, 0],
        [4, 4],
        [4, 0],
        [0, 4],
      ]),
    ).toBe(false);
  });

  it('isConvex distingue convexos de cóncavos y admite vértices alineados', () => {
    expect(isConvex(SQUARE)).toBe(true);
    expect(
      isConvex([
        [0, 0],
        [2, 0],
        [4, 0],
        [4, 4],
        [0, 4],
      ]),
    ).toBe(true);
    expect(
      isConvex([
        [0, 0],
        [4, 0],
        [2, 1],
        [4, 4],
        [0, 4],
      ]),
    ).toBe(false);
  });
});
