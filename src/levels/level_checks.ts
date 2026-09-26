import { findSectorAt, ringPoints, surfaceHeightAt } from '../engine/level/level_queries';
import type { KeyColor, LevelData, SectorData, SlabData } from '../engine/level/level_types';
import { pointInPolygon } from '../engine/level/polygon_utils';

/**
 * Comprobaciones de jugabilidad de un nivel sobre el grafo de sectores (sin física):
 * desde el inicio, ¿a qué sectores se llega con unas llaves dadas? Tiene en cuenta la altura que
 * se puede subir (escalón o salto), el hueco libre bajo el techo, los dos niveles de los
 * ascensores y las puertas con llave. Cada losa es un nodo más del grafo (con índice negativo:
 * -1 - número de losa), unido a los sectores de sus bordes a los que se puede pasar.
 */

/** Lo más alto que se puede subir de un sector a otro (salto incluido). */
export const MAX_RISE = 1.2;
/** Hueco mínimo para pasar agachado. */
export const MIN_HEADROOM = 1.15;

function floorsOf(sector: SectorData, x: number, z: number): number[] {
  const floor = surfaceHeightAt(sector.floor, x, z);
  return sector.special?.type === 'lift' ? [floor, sector.special.lowHeight] : [floor];
}

function ceilingOf(sector: SectorData, x: number, z: number): number {
  return sector.sky ? Infinity : surfaceHeightAt(sector.ceiling, x, z);
}

function canCross(from: SectorData, to: SectorData, x: number, z: number): boolean {
  const ceiling = Math.min(ceilingOf(from, x, z), ceilingOf(to, x, z));
  for (const a of floorsOf(from, x, z)) {
    for (const b of floorsOf(to, x, z)) {
      if (b - a <= MAX_RISE && ceiling - Math.max(a, b) >= MIN_HEADROOM) return true;
    }
  }
  return false;
}

export interface LevelGraph {
  /** Vecinos de cada sector a los que se puede pasar (sin contar llaves). */
  neighbours: Map<number, Set<number>>;
  start: number;
}

export function buildGraph(level: LevelData): LevelGraph {
  const owners = new Map<string, { sector: number; a: number; b: number }[]>();
  for (const sector of level.sectors) {
    for (const ring of [sector.outer, ...sector.holes]) {
      ring.forEach((a, i) => {
        const b = ring[(i + 1) % ring.length]!;
        const k = a < b ? `${a}:${b}` : `${b}:${a}`;
        const list = owners.get(k) ?? [];
        list.push({ sector: sector.index, a, b });
        owners.set(k, list);
      });
    }
  }
  const neighbours = new Map<number, Set<number>>();
  for (const sector of level.sectors) neighbours.set(sector.index, new Set());
  for (const list of owners.values()) {
    if (list.length !== 2) continue;
    const [p, q] = list as [(typeof list)[0], (typeof list)[0]];
    const a = level.vertices[p.a]!;
    const b = level.vertices[p.b]!;
    const x = (a[0] + b[0]) / 2;
    const z = (a[1] + b[1]) / 2;
    const sp = level.sectors[p.sector]!;
    const sq = level.sectors[q.sector]!;
    if (canCross(sp, sq, x, z)) neighbours.get(sp.index)!.add(sq.index);
    if (canCross(sq, sp, x, z)) neighbours.get(sq.index)!.add(sp.index);
  }
  level.slabs.forEach((slab, i) => connectSlab(level, slab, -1 - i, neighbours));
  const start = level.things.find((t) => t.type === 'player_start')!;
  const startSector = findSectorAt(level, start.position[0], start.position[1]);
  if (!startSector) throw new Error('El inicio está fuera de los sectores');
  return { neighbours, start: startSector.index };
}

/** Une una losa con los sectores que tocan sus bordes (subiendo o bajando lo permitido). */
function connectSlab(
  level: LevelData,
  slab: SlabData,
  node: number,
  neighbours: Map<number, Set<number>>,
): void {
  const own = new Set<number>();
  neighbours.set(node, own);
  const ring = ringPoints(level, slab.outer);
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length]!;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = (b[1] - a[1]) / length;
    const nz = -(b[0] - a[0]) / length;
    for (let d = 0.5; d < length; d += 1) {
      const px = a[0] + ((b[0] - a[0]) * d) / length;
      const pz = a[1] + ((b[1] - a[1]) * d) / length;
      // El punto de fuera es el que no queda dentro de la losa.
      const sign = pointInPolygon(px + nx * 0.3, pz + nz * 0.3, ring) ? -1 : 1;
      const sector = findSectorAt(level, px + nx * 0.3 * sign, pz + nz * 0.3 * sign);
      if (!sector) continue;
      const floor = surfaceHeightAt(sector.floor, px, pz);
      const ceiling = sector.sky ? Infinity : surfaceHeightAt(sector.ceiling, px, pz);
      if (ceiling - Math.max(floor, slab.top) < MIN_HEADROOM) continue;
      if (slab.top - floor <= MAX_RISE) neighbours.get(sector.index)!.add(node);
      if (floor - slab.top <= MAX_RISE) own.add(sector.index);
    }
  });
}

/** Sectores alcanzables desde el inicio con las llaves indicadas. */
export function reachable(
  level: LevelData,
  graph: LevelGraph,
  keys: ReadonlySet<KeyColor>,
): Set<number> {
  const seen = new Set<number>([graph.start]);
  const queue = [graph.start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of graph.neighbours.get(current) ?? []) {
      if (seen.has(next)) continue;
      const special = next >= 0 ? level.sectors[next]!.special : undefined;
      if (special?.type === 'door' && special.key && !keys.has(special.key)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

export interface Playthrough {
  /** Llaves en el orden en que se pueden conseguir. */
  keyOrder: KeyColor[];
  reachableWithKeys: Set<number>;
  exitReachable: boolean;
  exitReachableWithoutKeys: boolean;
}

/** Nodo en el que está una cosa: la losa sobre la que está apoyada (si indica `y`) o su sector. */
function sectorOfThing(level: LevelData, x: number, z: number, y?: number): number | undefined {
  if (y !== undefined) {
    const slab = level.slabs.findIndex(
      (s) => Math.abs(s.top - y) < 0.3 && pointInPolygon(x, z, ringPoints(level, s.outer)),
    );
    if (slab >= 0) return -1 - slab;
  }
  return findSectorAt(level, x, z)?.index;
}

/** Simula la partida: recoge todas las llaves alcanzables hasta que no aparezcan más. */
export function playthrough(level: LevelData): Playthrough {
  const graph = buildGraph(level);
  const keyThings = level.things
    .filter((t) => t.type === 'pickup' && String(t.properties.item).startsWith('key_'))
    .map((t) => ({
      color: String(t.properties.item).slice(4) as KeyColor,
      sector: sectorOfThing(level, t.position[0], t.position[1], t.y),
    }));
  const exits = level.things
    .filter((t) => t.type === 'exit')
    .map((t) => sectorOfThing(level, ...t.position));

  const keys = new Set<KeyColor>();
  const keyOrder: KeyColor[] = [];
  let area = reachable(level, graph, keys);
  for (;;) {
    const found = keyThings.filter(
      (k) => !keys.has(k.color) && k.sector !== undefined && area.has(k.sector),
    );
    if (found.length === 0) break;
    for (const k of found) {
      keys.add(k.color);
      keyOrder.push(k.color);
    }
    area = reachable(level, graph, keys);
  }
  const withoutKeys = reachable(level, graph, new Set());
  return {
    keyOrder,
    reachableWithKeys: area,
    exitReachable: exits.some((e) => e !== undefined && area.has(e)),
    exitReachableWithoutKeys: exits.some((e) => e !== undefined && withoutKeys.has(e)),
  };
}
