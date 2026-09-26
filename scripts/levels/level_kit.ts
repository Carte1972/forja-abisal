/**
 * Kit para escribir niveles con coordenadas en lugar de índices de vértices. Genera el JSON del
 * formato de nivel (ver README, "Cómo crear niveles nuevos"):
 * - Reúne los vértices repetidos en uno solo.
 * - Parte automáticamente las aristas que tienen vértices de otros sectores en mitad (uniones en T),
 *   así los sectores vecinos quedan conectados aunque sus lados no coincidan exactamente.
 */

export type P = [number, number];

export interface Surface {
  height: number;
  texture?: string;
  slope?: { from: P; to: P; toHeight: number };
}

export interface SectorOptions {
  id?: string;
  floor: Surface;
  /** Sin `texture` ni `sky`, se usa la textura por defecto del kit. */
  ceiling: Surface & { sky?: boolean };
  walls?: string | { middle: string; upper?: string; lower?: string };
  light?: number;
  secret?: boolean;
  special?: Record<string, unknown>;
  holes?: P[][];
}

interface SectorEntry {
  outer: P[];
  holes: P[][];
  options: SectorOptions;
}

interface SlabEntry {
  outer: P[];
  bottom: number;
  top: number;
  texture: string | { top: string; bottom: string; side: string };
}

export function rect(x0: number, z0: number, x1: number, z1: number): P[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

const key = (p: P) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;

function onSegmentInterior(p: P, a: P, b: P): number | null {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq < 1e-12) return null;
  const cross = Math.abs(dx * (p[1] - a[1]) - dz * (p[0] - a[0])) / Math.sqrt(lengthSq);
  if (cross > 1e-6) return null;
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / lengthSq;
  return t > 1e-6 && t < 1 - 1e-6 ? t : null;
}

export class LevelKit {
  private readonly sectors: SectorEntry[] = [];
  private readonly slabs: SlabEntry[] = [];
  private readonly things: Record<string, unknown>[] = [];
  private readonly defaults: { floor: string; ceiling: string; walls: string };
  private readonly name: string;
  private readonly environment: Record<string, unknown> | undefined;

  // Sin propiedades en el constructor: Node ejecuta este archivo quitando solo los tipos.
  constructor(
    name: string,
    defaults: { floor: string; ceiling: string; walls: string },
    environment?: Record<string, unknown>,
  ) {
    this.name = name;
    this.defaults = defaults;
    this.environment = environment;
  }

  sector(outer: P[], options: SectorOptions): this {
    this.sectors.push({ outer, holes: options.holes ?? [], options });
    return this;
  }

  room(x0: number, z0: number, x1: number, z1: number, options: SectorOptions): this {
    return this.sector(rect(x0, z0, x1, z1), options);
  }

  /**
   * Escalera recta de `steps` peldaños dentro del rectángulo, que sube de `from` a `to` en la
   * dirección indicada ('+x', '-x', '+z', '-z'). El último peldaño queda a la altura `to`.
   * El techo de cada peldaño es `ceiling`, o el suelo del peldaño más `headroom`.
   */
  stairs(
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    opts: {
      dir: '+x' | '-x' | '+z' | '-z';
      steps: number;
      from: number;
      to: number;
      ceiling?: number;
      headroom?: number;
      sky?: boolean;
      texture?: string;
      walls?: SectorOptions['walls'];
      light?: number;
      id?: string;
    },
  ): this {
    const axis = opts.dir[1] as 'x' | 'z';
    const positive = opts.dir[0] === '+';
    const start = axis === 'x' ? (positive ? x0 : x1) : positive ? z0 : z1;
    const end = axis === 'x' ? (positive ? x1 : x0) : positive ? z1 : z0;
    for (let i = 0; i < opts.steps; i++) {
      const a = start + ((end - start) * i) / opts.steps;
      const b = start + ((end - start) * (i + 1)) / opts.steps;
      const floor = opts.from + ((opts.to - opts.from) * (i + 1)) / opts.steps;
      const poly = axis === 'x' ? rect(a, z0, b, z1) : rect(x0, a, x1, b);
      const ceilingHeight = opts.ceiling ?? floor + (opts.headroom ?? 3.5);
      this.sector(poly, {
        id: opts.id ? `${opts.id}_${i + 1}` : undefined,
        floor: { height: round(floor), texture: opts.texture ?? 'stone_step' },
        ceiling: opts.sky ? { height: ceilingHeight, sky: true } : { height: round(ceilingHeight) },
        walls: opts.walls ?? { middle: this.defaults.walls, lower: opts.texture ?? 'stone_step' },
        light: opts.light,
      });
    }
    return this;
  }

  slab(outer: P[], bottom: number, top: number, texture: SlabEntry['texture']): this {
    this.slabs.push({ outer, bottom, top, texture });
    return this;
  }

  thing(type: string, x: number, z: number, extra: Record<string, unknown> = {}): this {
    this.things.push({ type, x, z, ...extra });
    return this;
  }

  enemy(kind: string, x: number, z: number, angle = 0, extra: Record<string, unknown> = {}): this {
    return this.thing('enemy', x, z, { kind, angle, ...extra });
  }

  pickup(item: string, x: number, z: number, extra: Record<string, unknown> = {}): this {
    return this.thing('pickup', x, z, { item, ...extra });
  }

  lamp(x: number, z: number, color: string, extra: Record<string, unknown> = {}): this {
    return this.thing('lamp', x, z, { color, ...extra });
  }

  build(): Record<string, unknown> {
    const rings: P[][] = [];
    for (const s of this.sectors) rings.push(s.outer, ...s.holes);
    for (const s of this.slabs) rings.push(s.outer);

    // Todos los vértices distintos, para partir las aristas que los tienen en mitad.
    const unique = new Map<string, P>();
    for (const ring of rings) for (const p of ring) unique.set(key(p), p);
    const points = [...unique.values()];

    const split = (ring: P[]): P[] => {
      const out: P[] = [];
      ring.forEach((a, i) => {
        const b = ring[(i + 1) % ring.length]!;
        out.push(a);
        const inner = points
          .map((p) => ({ p, t: onSegmentInterior(p, a, b) }))
          .filter((entry): entry is { p: P; t: number } => entry.t !== null)
          .sort((m, n) => m.t - n.t);
        for (const { p } of inner) out.push(p);
      });
      return out;
    };

    const vertices: P[] = [];
    const indexOf = new Map<string, number>();
    const index = (p: P): number => {
      const k = key(p);
      let i = indexOf.get(k);
      if (i === undefined) {
        i = vertices.length;
        vertices.push([round(p[0]), round(p[1])]);
        indexOf.set(k, i);
      }
      return i;
    };
    const ringIndices = (ring: P[]) => split(ring).map(index);

    const sectors = this.sectors.map((s) => {
      const o = s.options;
      const sector: Record<string, unknown> = {
        vertices: ringIndices(s.outer),
        floor: { texture: this.defaults.floor, ...o.floor },
        ceiling: o.ceiling.sky
          ? { height: o.ceiling.height, sky: true }
          : { texture: this.defaults.ceiling, ...o.ceiling },
        walls: o.walls ?? this.defaults.walls,
      };
      if (o.id) sector.id = o.id;
      if (s.holes.length > 0) sector.holes = s.holes.map(ringIndices);
      if (o.light !== undefined) sector.light = o.light;
      if (o.secret) sector.secret = true;
      if (o.special) sector.special = o.special;
      return sector;
    });
    const slabs = this.slabs.map((s) => ({
      vertices: ringIndices(s.outer),
      bottom: s.bottom,
      top: s.top,
      texture: s.texture,
    }));

    const level: Record<string, unknown> = { version: 1, name: this.name };
    if (this.environment) level.environment = this.environment;
    Object.assign(level, { vertices, sectors, slabs, things: this.things });
    return level;
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
