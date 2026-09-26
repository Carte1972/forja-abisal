import type { LevelData, Point2, SectorData, SurfaceData } from './level_types';
import { pointInPolygon } from './polygon_utils';

/** Altura de una superficie (plana o inclinada) en el punto (x, z). */
export function surfaceHeightAt(surface: SurfaceData, x: number, z: number): number {
  const { slope } = surface;
  if (!slope) return surface.height;
  const dx = slope.to[0] - slope.from[0];
  const dz = slope.to[1] - slope.from[1];
  const t = ((x - slope.from[0]) * dx + (z - slope.from[1]) * dz) / (dx * dx + dz * dz);
  return surface.height + (slope.toHeight - surface.height) * t;
}

export function ringPoints(level: LevelData, ring: readonly number[]): Point2[] {
  return ring.map((index) => level.vertices[index]!);
}

export function sectorContains(
  level: LevelData,
  sector: SectorData,
  x: number,
  z: number,
): boolean {
  if (!pointInPolygon(x, z, ringPoints(level, sector.outer))) return false;
  return !sector.holes.some((hole) => pointInPolygon(x, z, ringPoints(level, hole)));
}

export function findSectorAt(level: LevelData, x: number, z: number): SectorData | undefined {
  return level.sectors.find((sector) => sectorContains(level, sector, x, z));
}
