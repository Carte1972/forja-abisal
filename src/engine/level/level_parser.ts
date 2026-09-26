import { FLICKER_MODES, type FlickerMode } from '../render/light_effects';
import {
  KEY_COLORS,
  type EnvironmentData,
  type KeyColor,
  type LevelData,
  type Point2,
  type SectorData,
  type SectorSpecial,
  type SlabData,
  type SlopeData,
  type SurfaceData,
  type ThingData,
  type WallTextures,
} from './level_types';
import { findSectorAt, ringPoints, surfaceHeightAt } from './level_queries';
import { isConvex, isSimplePolygon, pointOnSegmentInterior, signedArea } from './polygon_utils';

export class LevelValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(`Nivel no válido:\n- ${issues.join('\n- ')}`);
    this.name = 'LevelValidationError';
  }
}

export const DEFAULT_ENVIRONMENT: EnvironmentData = {
  fog: { color: 0x1b1512, near: 14, far: 75 },
  sky: { top: 0x120c1c, horizon: 0x5a2618, bottom: 0x1b1512, clouds: 0.55 },
  ambient: { color: 0xc8b8ac, intensity: 0.9 },
  sun: { color: 0xffb488, intensity: 2.2, direction: [0.45, -0.75, 0.4] },
};

const DEFAULTS = {
  light: 0.8,
  doorSpeed: 2.5,
  doorWait: 4,
  liftSpeed: 2.5,
  liftWait: 3,
  doorTexture: 'door_metal',
  liftTexture: 'tech_panel',
} as const;

type Json = Record<string, unknown>;

/** Recolecta errores con su ruta en el JSON en lugar de detenerse en el primero. */
class Reader {
  readonly issues: string[] = [];

  error(path: string, message: string): void {
    this.issues.push(`${path}: ${message}`);
  }

  object(value: unknown, path: string): Json | undefined {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as Json;
    this.error(path, 'debe ser un objeto');
    return undefined;
  }

  array(value: unknown, path: string): unknown[] | undefined {
    if (Array.isArray(value)) return value;
    this.error(path, 'debe ser una lista');
    return undefined;
  }

  number(value: unknown, path: string): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    this.error(path, 'debe ser un número');
    return undefined;
  }

  optionalNumber(value: unknown, path: string, fallback: number): number {
    return value === undefined ? fallback : (this.number(value, path) ?? fallback);
  }

  string(value: unknown, path: string): string | undefined {
    if (typeof value === 'string' && value.length > 0) return value;
    this.error(path, 'debe ser un texto no vacío');
    return undefined;
  }

  /** Color en formato "#rrggbb" convertido a 0xRRGGBB. */
  color(value: unknown, path: string, fallback: number): number {
    if (value === undefined) return fallback;
    if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
      return Number.parseInt(value.slice(1), 16);
    }
    this.error(path, 'debe ser un color "#rrggbb"');
    return fallback;
  }

  point(value: unknown, path: string): Point2 | undefined {
    const list = this.array(value, path);
    if (!list) return undefined;
    if (list.length !== 2 || !list.every((n) => typeof n === 'number' && Number.isFinite(n))) {
      this.error(path, 'debe ser un par [x, z] de números');
      return undefined;
    }
    return [list[0] as number, list[1] as number];
  }
}

/**
 * Valida un nivel en JSON y lo normaliza: orienta los anillos, rellena valores por defecto
 * y comprueba la topología (aristas compartidas, uniones en T, alturas coherentes).
 * Lanza LevelValidationError con todos los problemas encontrados.
 */
export function parseLevel(json: unknown): LevelData {
  const r = new Reader();
  const root = r.object(json, 'nivel');
  if (!root) throw new LevelValidationError(r.issues);

  if (root.version !== 1) r.error('version', 'solo se admite la versión 1');
  const name = r.string(root.name, 'name') ?? 'Sin nombre';

  const vertices: Point2[] = [];
  (r.array(root.vertices, 'vertices') ?? []).forEach((value, i) => {
    vertices.push(r.point(value, `vertices[${i}]`) ?? [0, 0]);
  });

  const readRing = (
    value: unknown,
    path: string,
    wantPositiveArea: boolean,
  ): number[] | undefined => {
    const list = r.array(value, path);
    if (!list) return undefined;
    if (list.length < 3) {
      r.error(path, 'un polígono necesita al menos 3 vértices');
      return undefined;
    }
    const ring: number[] = [];
    for (const [i, index] of list.entries()) {
      if (
        !Number.isInteger(index) ||
        (index as number) < 0 ||
        (index as number) >= vertices.length
      ) {
        r.error(`${path}[${i}]`, `índice de vértice no válido (${String(index)})`);
        return undefined;
      }
      ring.push(index as number);
    }
    if (new Set(ring).size !== ring.length) {
      r.error(path, 'un polígono no puede repetir vértices');
      return undefined;
    }
    const points = ring.map((i) => vertices[i]!);
    if (!isSimplePolygon(points)) {
      r.error(path, 'el polígono se corta a sí mismo');
      return undefined;
    }
    const area = signedArea(points);
    if (Math.abs(area) < 1e-6) {
      r.error(path, 'el polígono no tiene área');
      return undefined;
    }
    return area > 0 === wantPositiveArea ? ring : ring.reverse();
  };

  const readSlope = (value: unknown, path: string): SlopeData | undefined => {
    if (value === undefined) return undefined;
    const obj = r.object(value, path);
    if (!obj) return undefined;
    const from = r.point(obj.from, `${path}.from`);
    const to = r.point(obj.to, `${path}.to`);
    const toHeight = r.number(obj.toHeight, `${path}.toHeight`);
    if (!from || !to || toHeight === undefined) return undefined;
    if (Math.hypot(to[0] - from[0], to[1] - from[1]) < 1e-6) {
      r.error(path, '"from" y "to" deben ser puntos distintos');
      return undefined;
    }
    return { from, to, toHeight };
  };

  const readSurface = (value: unknown, path: string, allowMissingTexture: boolean): SurfaceData => {
    const obj = r.object(value, path) ?? {};
    const height = r.number(obj.height, `${path}.height`) ?? 0;
    const texture =
      allowMissingTexture && obj.texture === undefined
        ? 'sky'
        : (r.string(obj.texture, `${path}.texture`) ?? 'missing');
    const slope = readSlope(obj.slope, `${path}.slope`);
    return slope ? { height, texture, slope } : { height, texture };
  };

  const readWalls = (value: unknown, path: string): WallTextures => {
    if (typeof value === 'string') return { middle: value, upper: value, lower: value };
    const obj = r.object(value, path) ?? {};
    const middle = r.string(obj.middle, `${path}.middle`) ?? 'missing';
    const upper =
      obj.upper === undefined ? middle : (r.string(obj.upper, `${path}.upper`) ?? middle);
    const lower =
      obj.lower === undefined ? middle : (r.string(obj.lower, `${path}.lower`) ?? middle);
    return { middle, upper, lower };
  };

  const readSpecial = (value: unknown, path: string): SectorSpecial | undefined => {
    if (value === undefined) return undefined;
    const obj = r.object(value, path);
    if (!obj) return undefined;
    switch (obj.type) {
      case 'damage':
        return {
          type: 'damage',
          damagePerSecond: r.number(obj.damagePerSecond, `${path}.damagePerSecond`) ?? 10,
        };
      case 'door': {
        let key: KeyColor | undefined;
        if (obj.key !== undefined) {
          if (KEY_COLORS.includes(obj.key as KeyColor)) key = obj.key as KeyColor;
          else r.error(`${path}.key`, `debe ser una de: ${KEY_COLORS.join(', ')}`);
        }
        const door: SectorSpecial = {
          type: 'door',
          speed: r.optionalNumber(obj.speed, `${path}.speed`, DEFAULTS.doorSpeed),
          waitTime: r.optionalNumber(obj.waitTime, `${path}.waitTime`, DEFAULTS.doorWait),
          texture:
            obj.texture === undefined
              ? DEFAULTS.doorTexture
              : (r.string(obj.texture, `${path}.texture`) ?? DEFAULTS.doorTexture),
          hidden: obj.hidden === true,
        };
        return key ? { ...door, key } : door;
      }
      case 'lift':
        return {
          type: 'lift',
          lowHeight: r.number(obj.lowHeight, `${path}.lowHeight`) ?? 0,
          speed: r.optionalNumber(obj.speed, `${path}.speed`, DEFAULTS.liftSpeed),
          waitTime: r.optionalNumber(obj.waitTime, `${path}.waitTime`, DEFAULTS.liftWait),
          texture:
            obj.texture === undefined
              ? DEFAULTS.liftTexture
              : (r.string(obj.texture, `${path}.texture`) ?? DEFAULTS.liftTexture),
        };
      default:
        r.error(`${path}.type`, 'debe ser "damage", "door" o "lift"');
        return undefined;
    }
  };

  const environment = readEnvironment(r, root.environment);

  const sectors: SectorData[] = [];
  (r.array(root.sectors, 'sectors') ?? []).forEach((value, i) => {
    const path = `sectors[${i}]`;
    const obj = r.object(value, path);
    if (!obj) return;
    const outer = readRing(obj.vertices, `${path}.vertices`, true);
    const holes: number[][] = [];
    if (obj.holes !== undefined) {
      (r.array(obj.holes, `${path}.holes`) ?? []).forEach((hole, h) => {
        const ring = readRing(hole, `${path}.holes[${h}]`, false);
        if (ring) holes.push(ring);
      });
    }
    const ceilingObj = r.object(obj.ceiling, `${path}.ceiling`) ?? {};
    const sky = ceilingObj.sky === true;
    const light = r.optionalNumber(obj.light, `${path}.light`, DEFAULTS.light);
    if (light < 0 || light > 1) r.error(`${path}.light`, 'debe estar entre 0 y 1');
    const special = readSpecial(obj.special, `${path}.special`);
    const sector: SectorData = {
      index: i,
      outer: outer ?? [],
      holes,
      floor: readSurface(obj.floor, `${path}.floor`, false),
      ceiling: readSurface(obj.ceiling, `${path}.ceiling`, sky),
      sky,
      walls: readWalls(obj.walls, `${path}.walls`),
      light,
      secret: obj.secret === true,
    };
    if (typeof obj.id === 'string') sector.id = obj.id;
    if (special) sector.special = special;
    sectors.push(sector);
  });

  const slabs: SlabData[] = [];
  (root.slabs === undefined ? [] : (r.array(root.slabs, 'slabs') ?? [])).forEach((value, i) => {
    const path = `slabs[${i}]`;
    const obj = r.object(value, path);
    if (!obj) return;
    const outer = readRing(obj.vertices, `${path}.vertices`, true) ?? [];
    const bottom = r.number(obj.bottom, `${path}.bottom`) ?? 0;
    const top = r.number(obj.top, `${path}.top`) ?? 0;
    if (top <= bottom) r.error(path, '"top" debe ser mayor que "bottom"');
    let textures: SlabData['textures'];
    if (typeof obj.texture === 'string') {
      textures = { top: obj.texture, bottom: obj.texture, side: obj.texture };
    } else {
      const t = r.object(obj.texture, `${path}.texture`) ?? {};
      textures = {
        top: r.string(t.top, `${path}.texture.top`) ?? 'missing',
        bottom: r.string(t.bottom, `${path}.texture.bottom`) ?? 'missing',
        side: r.string(t.side, `${path}.texture.side`) ?? 'missing',
      };
    }
    const slab: SlabData = { index: i, outer, bottom, top, textures };
    if (obj.light !== undefined)
      slab.light = r.number(obj.light, `${path}.light`) ?? DEFAULTS.light;
    slabs.push(slab);
  });

  const things: ThingData[] = [];
  (r.array(root.things, 'things') ?? []).forEach((value, i) => {
    const path = `things[${i}]`;
    const obj = r.object(value, path);
    if (!obj) return;
    const type = r.string(obj.type, `${path}.type`) ?? 'unknown';
    const x = r.number(obj.x, `${path}.x`) ?? 0;
    const z = r.number(obj.z, `${path}.z`) ?? 0;
    const angleDeg = r.optionalNumber(obj.angle, `${path}.angle`, 0);
    const { type: _t, x: _x, z: _z, y, angle: _a, ...properties } = obj;
    const thing: ThingData = {
      type,
      position: [x, z],
      angle: (angleDeg * Math.PI) / 180,
      properties,
    };
    if (y !== undefined) thing.y = r.number(y, `${path}.y`) ?? 0;
    if (type === 'lamp') thing.properties = readLampProperties(r, properties, path);
    things.push(thing);
  });

  if (r.issues.length > 0) throw new LevelValidationError(r.issues);

  const level: LevelData = { version: 1, name, environment, vertices, sectors, slabs, things };
  validateTopology(level, r);
  if (r.issues.length > 0) throw new LevelValidationError(r.issues);
  return level;
}

function readEnvironment(r: Reader, value: unknown): EnvironmentData {
  const d = DEFAULT_ENVIRONMENT;
  if (value === undefined) return structuredClone(d);
  const env = r.object(value, 'environment') ?? {};
  const fog = env.fog === undefined ? {} : (r.object(env.fog, 'environment.fog') ?? {});
  const sky = env.sky === undefined ? {} : (r.object(env.sky, 'environment.sky') ?? {});
  const ambient =
    env.ambient === undefined ? {} : (r.object(env.ambient, 'environment.ambient') ?? {});
  const result: EnvironmentData = {
    fog: {
      color: r.color(fog.color, 'environment.fog.color', d.fog.color),
      near: r.optionalNumber(fog.near, 'environment.fog.near', d.fog.near),
      far: r.optionalNumber(fog.far, 'environment.fog.far', d.fog.far),
    },
    sky: {
      top: r.color(sky.top, 'environment.sky.top', d.sky.top),
      horizon: r.color(sky.horizon, 'environment.sky.horizon', d.sky.horizon),
      bottom: r.color(sky.bottom, 'environment.sky.bottom', d.sky.bottom),
      clouds: r.optionalNumber(sky.clouds, 'environment.sky.clouds', d.sky.clouds),
    },
    sun: d.sun ? { ...d.sun, direction: [...d.sun.direction] } : null,
    ambient: {
      color: r.color(ambient.color, 'environment.ambient.color', d.ambient.color),
      intensity: r.optionalNumber(
        ambient.intensity,
        'environment.ambient.intensity',
        d.ambient.intensity,
      ),
    },
  };
  if (env.sun === null) {
    result.sun = null;
  } else if (env.sun !== undefined) {
    const sun = r.object(env.sun, 'environment.sun') ?? {};
    const fallback = d.sun!;
    let direction = fallback.direction;
    if (sun.direction !== undefined) {
      const list = r.array(sun.direction, 'environment.sun.direction');
      if (
        list?.length === 3 &&
        list.every((n) => typeof n === 'number') &&
        (list[1] as number) < 0
      ) {
        direction = list as [number, number, number];
      } else {
        r.error('environment.sun.direction', 'debe ser [x, y, z] con y negativa (de arriba abajo)');
      }
    }
    result.sun = {
      color: r.color(sun.color, 'environment.sun.color', fallback.color),
      intensity: r.optionalNumber(sun.intensity, 'environment.sun.intensity', fallback.intensity),
      direction,
    };
  }
  if (result.fog.far <= result.fog.near)
    r.error('environment.fog', '"far" debe ser mayor que "near"');
  if (result.sky.clouds < 0 || result.sky.clouds > 1) {
    r.error('environment.sky.clouds', 'debe estar entre 0 y 1');
  }
  return result;
}

export interface LampProperties {
  color: number;
  intensity: number;
  radius: number;
  flicker: FlickerMode;
  shadows: boolean;
}

/** Valida las propiedades de una lámpara y rellena sus valores por defecto. */
function readLampProperties(
  r: Reader,
  props: Record<string, unknown>,
  path: string,
): Record<string, unknown> & LampProperties {
  const lamp: LampProperties = {
    color: r.color(props.color, `${path}.color`, 0xffd8a8),
    intensity: r.optionalNumber(props.intensity, `${path}.intensity`, 1),
    radius: r.optionalNumber(props.radius, `${path}.radius`, 10),
    flicker: 'steady',
    shadows: props.shadows === true,
  };
  if (props.flicker !== undefined) {
    if (FLICKER_MODES.includes(props.flicker as FlickerMode)) {
      lamp.flicker = props.flicker as FlickerMode;
    } else {
      r.error(`${path}.flicker`, `debe ser uno de: ${FLICKER_MODES.join(', ')}`);
    }
  }
  if (lamp.radius <= 0) r.error(`${path}.radius`, 'debe ser mayor que 0');
  if (lamp.intensity < 0) r.error(`${path}.intensity`, 'no puede ser negativa');
  return { ...props, ...lamp };
}

function validateTopology(level: LevelData, r: Reader): void {
  // Cada arista (dirigida) pertenece a un único anillo; la inversa, como mucho a otro sector.
  const directed = new Map<string, number>();
  const usedVertices = new Set<number>();
  const edges: [number, number][] = [];
  for (const sector of level.sectors) {
    for (const ring of [sector.outer, ...sector.holes]) {
      ring.forEach((a, i) => {
        const b = ring[(i + 1) % ring.length]!;
        usedVertices.add(a);
        const key = `${a}:${b}`;
        const owner = directed.get(key);
        if (owner !== undefined) {
          r.error(
            `sectors[${sector.index}]`,
            `la arista ${a}-${b} ya pertenece al sector ${owner} con la misma orientación (¿sectores solapados?)`,
          );
        } else {
          directed.set(key, sector.index);
          if (!directed.has(`${b}:${a}`)) edges.push([a, b]);
        }
      });
    }
  }

  // Uniones en T: un vértice apoyado en mitad de una arista impide detectar la contigüidad.
  for (const v of usedVertices) {
    const p = level.vertices[v]!;
    for (const [a, b] of edges) {
      if (a === v || b === v) continue;
      if (pointOnSegmentInterior(p, level.vertices[a]!, level.vertices[b]!)) {
        r.error(
          `vertices[${v}]`,
          `está sobre la arista ${a}-${b}; divide esa arista añadiendo el vértice a sus polígonos`,
        );
      }
    }
  }

  for (const sector of level.sectors) {
    const path = `sectors[${sector.index}]`;
    const points = ringPoints(level, sector.outer);
    for (const [x, z] of points) {
      const floor = surfaceHeightAt(sector.floor, x, z);
      const ceiling = surfaceHeightAt(sector.ceiling, x, z);
      if (ceiling <= floor) {
        r.error(
          path,
          `el techo (${ceiling}) debe estar por encima del suelo (${floor}) en (${x}, ${z})`,
        );
        break;
      }
    }
    const special = sector.special;
    if (special?.type === 'door' || special?.type === 'lift') {
      if (!isConvex(points) || sector.holes.length > 0) {
        r.error(path, 'las puertas y los ascensores deben ser polígonos convexos sin huecos');
      }
      if (sector.floor.slope || sector.ceiling.slope) {
        r.error(path, 'las puertas y los ascensores deben tener suelo y techo planos');
      }
      if (special.speed <= 0) r.error(`${path}.special.speed`, 'debe ser mayor que 0');
    }
    if (special?.type === 'door' && sector.sky) {
      r.error(path, 'una puerta no puede tener cielo');
    }
    if (special?.type === 'lift' && special.lowHeight >= sector.floor.height) {
      r.error(`${path}.special.lowHeight`, 'debe ser menor que la altura del suelo del ascensor');
    }
  }

  for (const slab of level.slabs) {
    const inside = ringPoints(level, slab.outer).some(([x, z]) => findSectorAt(level, x, z));
    if (!inside) r.error(`slabs[${slab.index}]`, 'la losa está fuera de todos los sectores');
  }

  const starts = level.things.filter((t) => t.type === 'player_start');
  if (starts.length !== 1)
    r.error('things', `debe haber exactamente un "player_start" (hay ${starts.length})`);
  level.things.forEach((thing, i) => {
    if (!findSectorAt(level, thing.position[0], thing.position[1])) {
      r.error(`things[${i}]`, `(${thing.position.join(', ')}) está fuera de todos los sectores`);
    }
  });
}
