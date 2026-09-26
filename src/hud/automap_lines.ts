import type { KeyColor, LevelData, Point2 } from '../engine/level/level_types';

/**
 * Líneas del automapa a partir de los sectores (puro, sin DOM). Cada arista se clasifica:
 * - `wall`: pared sólida (solo un sector a un lado, o una pared secreta, que no se delata).
 * - `step`: dos sectores con distinta altura de suelo o de techo (escalón, cornisa).
 * - `hazard`: borde de un suelo que hace daño.
 * - `door` / `lift`: borde de una puerta o un ascensor (las puertas con el color de su llave).
 * Las aristas entre sectores al mismo nivel no se dibujan.
 */

export type AutomapKind = 'wall' | 'step' | 'hazard' | 'door' | 'lift';

export interface AutomapLine {
  a: Point2;
  b: Point2;
  kind: AutomapKind;
  key?: KeyColor;
  /** Sectores a los lados (la línea se ve cuando se ha descubierto alguno de ellos). */
  sectors: number[];
}

export function buildAutomapLines(level: LevelData): AutomapLine[] {
  const edges = new Map<string, { a: number; b: number; sectors: number[] }>();
  for (const sector of level.sectors) {
    for (const ring of [sector.outer, ...sector.holes]) {
      ring.forEach((a, i) => {
        const b = ring[(i + 1) % ring.length]!;
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        const entry = edges.get(key) ?? { a, b, sectors: [] };
        entry.sectors.push(sector.index);
        edges.set(key, entry);
      });
    }
  }

  const lines: AutomapLine[] = [];
  for (const { a, b, sectors } of edges.values()) {
    const [s1, s2] = sectors.map((i) => level.sectors[i]!);
    const line = (kind: AutomapKind, key?: KeyColor): AutomapLine => ({
      a: level.vertices[a]!,
      b: level.vertices[b]!,
      kind,
      ...(key ? { key } : {}),
      sectors,
    });
    if (!s2) {
      lines.push(line('wall'));
      continue;
    }
    const specials = [s1!.special, s2.special];
    const door = specials.find((s) => s?.type === 'door');
    if (door?.type === 'door') {
      lines.push(door.hidden ? line('wall') : line('door', door.key));
      continue;
    }
    if (specials.some((s) => s?.type === 'lift')) {
      lines.push(line('lift'));
      continue;
    }
    const hazard = specials.filter((s) => s?.type === 'damage').length === 1;
    if (hazard) {
      lines.push(line('hazard'));
      continue;
    }
    const differentFloor =
      Math.abs(s1!.floor.height - s2.floor.height) > 0.01 || !!s1!.floor.slope !== !!s2.floor.slope;
    const differentCeiling =
      s1!.sky !== s2.sky || (!s1!.sky && Math.abs(s1!.ceiling.height - s2.ceiling.height) > 0.01);
    if (differentFloor || differentCeiling) lines.push(line('step'));
  }
  return lines;
}
