import earcut from 'earcut';
import { findSectorAt, ringPoints, surfaceHeightAt } from './level_queries';
import { triangulateSurface } from './surface_triangulation';
import type { LevelData, Point2, SectorData, SlabData, SurfaceData } from './level_types';

/**
 * Generador de geometría puro (sin Three.js): convierte sectores y losas en lotes de
 * triángulos agrupados por textura, una malla de colisión estática y los prismas móviles
 * de puertas y ascensores.
 */

/** Repeticiones de textura por metro (una textura cubre 2 m). */
export const TEXTURE_SCALE = 0.5;
const EPS = 1e-6;
/**
 * Cuánto se mete hacia dentro la geometría visible de puertas y ascensores. Sin este margen,
 * al moverse, sus caras quedarían en el mismo plano que las paredes estáticas y parpadearían.
 */
export const MOVER_INSET = 0.02;
/** Prolongación oculta de puertas (hacia arriba) y ascensores (hacia abajo). */
export const MOVER_SKIRT = 0.5;
/**
 * Ancho máximo de las columnas en que se dibujan las paredes. Algunas GPU (ANGLE sobre Metal, al
 * menos) no dibujan triángulos largos y finos que cruzan el plano de la cámara; los suelos y
 * techos lo evitan con `triangulateSurface`. La colisión usa las piezas enteras.
 */
export const MAX_RENDER_EDGE = 2;

export interface GeometryBatch {
  positions: number[];
  normals: number[];
  uvs: number[];
  /** Color de vértice RGB: la luz del sector horneada. */
  colors: number[];
  indices: number[];
}

export interface CollisionMesh {
  positions: number[];
  indices: number[];
}

export interface MoverGeometry {
  sectorIndex: number;
  kind: 'door' | 'lift';
  /** Geometría en la posición inicial (puerta cerrada, ascensor arriba). */
  batches: Map<string, GeometryBatch>;
  /** Puntos del prisma (x, y, z consecutivos) en la posición inicial, para el collider convexo. */
  hullPoints: number[];
  /** Recorrido vertical: positivo si sube (puerta), negativo si baja (ascensor). */
  travel: number;
}

export interface LevelGeometry {
  batches: Map<string, GeometryBatch>;
  collision: CollisionMesh;
  movers: MoverGeometry[];
}

type P3 = [number, number, number];
type UvFn = (p: P3) => [number, number];

const UP: P3 = [0, 1, 0];
const DOWN: P3 = [0, -1, 0];

const floorUv: UvFn = ([x, , z]) => [x * TEXTURE_SCALE, -z * TEXTURE_SCALE];

class MeshWriter {
  readonly batches = new Map<string, GeometryBatch>();

  constructor(private readonly collision: CollisionMesh | null) {}

  /**
   * Añade un polígono plano ya triangulado. La normal se calcula a partir de los puntos y se
   * orienta hacia `expectedNormal`; cada triángulo se reordena para que su cara frontal
   * (antihoraria) mire en esa dirección.
   */
  addPolygon(
    texture: string,
    points: P3[],
    triangles: readonly number[],
    expectedNormal: P3,
    uv: UvFn,
    light: number,
    collide = true,
  ): void {
    const normal = planeNormal(points, triangles, expectedNormal);
    if (!normal) return;

    const oriented = orientTriangles(points, triangles, normal);
    const batch = this.batch(texture);
    const base = batch.positions.length / 3;
    for (const p of points) {
      batch.positions.push(p[0], p[1], p[2]);
      batch.normals.push(normal[0], normal[1], normal[2]);
      const [u, v] = uv(p);
      batch.uvs.push(u, v);
      batch.colors.push(light, light, light);
    }
    for (const index of oriented) batch.indices.push(base + index);

    if (collide && this.collision) appendCollision(this.collision, points, oriented);
  }

  addCollisionOnly(points: P3[], triangles: readonly number[]): void {
    if (this.collision) appendCollision(this.collision, points, triangles);
  }

  private batch(texture: string): GeometryBatch {
    let batch = this.batches.get(texture);
    if (!batch) {
      batch = { positions: [], normals: [], uvs: [], colors: [], indices: [] };
      this.batches.set(texture, batch);
    }
    return batch;
  }
}

function appendCollision(collision: CollisionMesh, points: P3[], triangles: readonly number[]) {
  const base = collision.positions.length / 3;
  for (const p of points) collision.positions.push(p[0], p[1], p[2]);
  for (const index of triangles) collision.indices.push(base + index);
}

function dot(a: P3, b: P3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function scale(v: P3, s: number): void {
  v[0] *= s;
  v[1] *= s;
  v[2] *= s;
}

function triangleNormal(a: P3, b: P3, c: P3): P3 {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

/**
 * Normal de un polígono plano a partir de sus triángulos (los puntos pueden venir en cualquier
 * orden), orientada hacia `expected`. Devuelve null si el polígono no tiene área.
 */
function planeNormal(points: P3[], triangles: readonly number[], expected: P3): P3 | null {
  const n: P3 = [0, 0, 0];
  for (let t = 0; t < triangles.length; t += 3) {
    const face = triangleNormal(
      points[triangles[t]!]!,
      points[triangles[t + 1]!]!,
      points[triangles[t + 2]!]!,
    );
    const sign = dot(face, expected) < 0 ? -1 : 1;
    n[0] += face[0] * sign;
    n[1] += face[1] * sign;
    n[2] += face[2] * sign;
  }
  const length = Math.hypot(n[0], n[1], n[2]);
  if (length < EPS) return null;
  scale(n, 1 / length);
  return n;
}

function orientTriangles(points: P3[], triangles: readonly number[], normal: P3): number[] {
  const out: number[] = [];
  for (let t = 0; t < triangles.length; t += 3) {
    const i = triangles[t]!;
    const j = triangles[t + 1]!;
    const k = triangles[t + 2]!;
    const face = triangleNormal(points[i]!, points[j]!, points[k]!);
    const area2 = Math.hypot(face[0], face[1], face[2]);
    if (area2 < EPS) continue;
    if (dot(face, normal) >= 0) out.push(i, j, k);
    else out.push(i, k, j);
  }
  return out;
}

/** Triángulos en abanico para un polígono convexo de n puntos. */
function fan(count: number): number[] {
  const out: number[] = [];
  for (let i = 1; i < count - 1; i++) out.push(0, i, i + 1);
  return out;
}

/** Triangula un anillo exterior con huecos (en XZ) y devuelve los índices sobre la lista plana. */
function triangulate(rings: Point2[][]): { flat: Point2[]; triangles: number[] } {
  const flat: Point2[] = [];
  const coords: number[] = [];
  const holeIndices: number[] = [];
  rings.forEach((ring, i) => {
    if (i > 0) holeIndices.push(flat.length);
    for (const p of ring) {
      flat.push(p);
      coords.push(p[0], p[1]);
    }
  });
  return { flat, triangles: earcut(coords, holeIndices.length > 0 ? holeIndices : null, 2) };
}

/**
 * Pared vertical sobre la arista a→b entre dos perfiles de altura (abajo y arriba en cada
 * extremo). `normal2` es la dirección horizontal hacia la que mira la cara visible.
 */
function addWall(
  writer: MeshWriter,
  texture: string,
  a: Point2,
  b: Point2,
  bottom: readonly [number, number],
  top: readonly [number, number],
  normal2: Point2,
  light: number,
  collide = true,
  customUv?: UvFn,
): void {
  const points: P3[] = [
    [a[0], bottom[0], a[1]],
    [b[0], bottom[1], b[1]],
  ];
  if (top[1] - bottom[1] > EPS) points.push([b[0], top[1], b[1]]);
  if (top[0] - bottom[0] > EPS) points.push([a[0], top[0], a[1]]);
  if (points.length < 3) return;
  const uv: UvFn =
    customUv ??
    ((p) => [Math.hypot(p[0] - a[0], p[2] - a[1]) * TEXTURE_SCALE, p[1] * TEXTURE_SCALE]);
  const normal: P3 = [normal2[0], 0, normal2[1]];
  const columns = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / MAX_RENDER_EDGE);
  if (columns <= 1) {
    writer.addPolygon(texture, points, fan(points.length), normal, uv, light, collide);
    return;
  }
  // Paredes largas: se dibujan en columnas (ver MAX_RENDER_EDGE) y colisionan enteras.
  if (collide) writer.addCollisionOnly(points, fan(points.length));
  for (let k = 0; k < columns; k++) {
    const t0 = k / columns;
    const t1 = (k + 1) / columns;
    const p = lerp2(a, b, t0);
    const q = lerp2(a, b, t1);
    const column: P3[] = [
      [p[0], bottom[0] + (bottom[1] - bottom[0]) * t0, p[1]],
      [q[0], bottom[0] + (bottom[1] - bottom[0]) * t1, q[1]],
    ];
    const topQ = top[0] + (top[1] - top[0]) * t1;
    const topP = top[0] + (top[1] - top[0]) * t0;
    if (topQ - column[1]![1] > EPS) column.push([q[0], topQ, q[1]]);
    if (topP - column[0]![1] > EPS) column.push([p[0], topP, p[1]]);
    if (column.length >= 3) {
      writer.addPolygon(texture, column, fan(column.length), normal, uv, light, false);
    }
  }
}

/** Normal horizontal hacia el interior de un anillo (a la izquierda de a→b en ejes XZ). */
function interiorNormal(a: Point2, b: Point2): Point2 {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const length = Math.hypot(dx, dz);
  return [-dz / length, dx / length];
}

function lerp2(a: Point2, b: Point2, t: number): Point2 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Suelo efectivo para la geometría estática: el ascensor cuenta en su posición más baja. */
function staticFloor(sector: SectorData): SurfaceData {
  return sector.special?.type === 'lift'
    ? { height: sector.special.lowHeight, texture: sector.floor.texture }
    : sector.floor;
}

interface EdgeSide {
  sector: SectorData;
  a: number;
  b: number;
}

/**
 * Pared en la diferencia de altura entre dos sectores contiguos a lo largo de la arista.
 * `mode` indica qué superficie se compara: con suelos la pared mira al sector más bajo,
 * con techos al sector con el techo más alto. Si las superficies inclinadas se cruzan, la
 * arista se divide en el punto de cruce y cada tramo mira hacia su lado.
 */
function addDifferenceWall(
  writer: MeshWriter,
  level: LevelData,
  front: EdgeSide,
  back: SectorData,
  mode: 'floor' | 'ceiling',
): void {
  const a = level.vertices[front.a]!;
  const b = level.vertices[front.b]!;
  const surface = (sector: SectorData) => (mode === 'floor' ? staticFloor(sector) : sector.ceiling);
  const hf = (p: Point2) => surfaceHeightAt(surface(front.sector), p[0], p[1]);
  const hb = (p: Point2) => surfaceHeightAt(surface(back), p[0], p[1]);

  const dA = hb(a) - hf(a);
  const dB = hb(b) - hf(b);
  if (Math.abs(dA) <= EPS && Math.abs(dB) <= EPS) return;

  const pieces: [Point2, Point2][] = [];
  if ((dA > EPS && dB < -EPS) || (dA < -EPS && dB > EPS)) {
    const m = lerp2(a, b, dA / (dA - dB));
    pieces.push([a, m], [m, b]);
  } else {
    pieces.push([a, b]);
  }

  const frontNormal = interiorNormal(a, b);
  for (const [p, q] of pieces) {
    const mid = lerp2(p, q, 0.5);
    const backHigher = hb(mid) > hf(mid);
    // Con suelos se ve desde el lado más bajo; con techos, desde el lado más alto.
    const facesFront = mode === 'floor' ? backHigher : !backHigher;
    const viewer = facesFront ? front.sector : back;
    const behind = facesFront ? back : front.sector;
    const texture = mode === 'floor' ? behind.walls.lower : behind.walls.upper;
    const normal: Point2 = facesFront ? frontNormal : [-frontNormal[0], -frontNormal[1]];
    addWall(
      writer,
      texture,
      p,
      q,
      [Math.min(hf(p), hb(p)), Math.min(hf(q), hb(q))],
      [Math.max(hf(p), hb(p)), Math.max(hf(q), hb(q))],
      normal,
      viewer.light,
    );
  }
}

export function buildLevelGeometry(level: LevelData): LevelGeometry {
  const collision: CollisionMesh = { positions: [], indices: [] };
  const writer = new MeshWriter(collision);

  // Aristas agrupadas sin dirección: una entrada = pared sólida; dos = paso entre sectores.
  const edgeSides = new Map<string, EdgeSide[]>();
  for (const sector of level.sectors) {
    for (const ring of [sector.outer, ...sector.holes]) {
      ring.forEach((a, i) => {
        const b = ring[(i + 1) % ring.length]!;
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        const sides = edgeSides.get(key) ?? [];
        sides.push({ sector, a, b });
        edgeSides.set(key, sides);
      });
    }
  }

  for (const sector of level.sectors) addSectorSurfaces(writer, level, sector);

  for (const sides of edgeSides.values()) {
    const [first, second] = sides;
    if (!first) continue;
    if (!second) {
      addSolidWall(writer, level, first);
      continue;
    }
    addDifferenceWall(writer, level, first, second.sector, 'floor');
    if (!(first.sector.sky && second.sector.sky)) {
      addDifferenceWall(writer, level, first, second.sector, 'ceiling');
    }
  }

  for (const slab of level.slabs) addSlab(writer, level, slab);

  const movers = level.sectors
    .filter((s) => s.special?.type === 'door' || s.special?.type === 'lift')
    .map((sector) => buildMover(level, sector, edgeSides));

  return { batches: writer.batches, collision, movers };
}

function addSectorSurfaces(writer: MeshWriter, level: LevelData, sector: SectorData): void {
  const { points: flat, triangles } = triangulateSurface(level.vertices, [
    sector.outer,
    ...sector.holes,
  ]);

  // El suelo del ascensor y el techo de la puerta son parte de sus prismas móviles.
  if (sector.special?.type !== 'lift') {
    const floor = flat.map(([x, z]): P3 => [x, surfaceHeightAt(sector.floor, x, z), z]);
    writer.addPolygon(sector.floor.texture, floor, triangles, UP, floorUv, sector.light);
  }
  const ceiling = flat.map(([x, z]): P3 => [x, surfaceHeightAt(sector.ceiling, x, z), z]);
  if (sector.sky) {
    // Techo invisible: impide salir del nivel saltando por encima de las paredes exteriores.
    writer.addCollisionOnly(ceiling, triangles);
  } else if (sector.special?.type !== 'door') {
    writer.addPolygon(sector.ceiling.texture, ceiling, triangles, DOWN, floorUv, sector.light);
  }
}

function addSolidWall(writer: MeshWriter, level: LevelData, side: EdgeSide): void {
  const { sector } = side;
  const a = level.vertices[side.a]!;
  const b = level.vertices[side.b]!;
  const floor = staticFloor(sector);
  addWall(
    writer,
    sector.walls.middle,
    a,
    b,
    [surfaceHeightAt(floor, a[0], a[1]), surfaceHeightAt(floor, b[0], b[1])],
    [surfaceHeightAt(sector.ceiling, a[0], a[1]), surfaceHeightAt(sector.ceiling, b[0], b[1])],
    interiorNormal(a, b),
    sector.light,
  );
}

function addSlab(writer: MeshWriter, level: LevelData, slab: SlabData): void {
  const points = ringPoints(level, slab.outer);
  const { points: flat, triangles } = triangulateSurface(level.vertices, [slab.outer]);
  const light = slab.light ?? lightInside(level, flat, triangles);

  const top = flat.map(([x, z]): P3 => [x, slab.top, z]);
  const bottom = flat.map(([x, z]): P3 => [x, slab.bottom, z]);
  writer.addPolygon(slab.textures.top, top, triangles, UP, floorUv, light);
  writer.addPolygon(slab.textures.bottom, bottom, triangles, DOWN, floorUv, light);
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length]!;
    const inward = interiorNormal(a, b);
    addWall(
      writer,
      slab.textures.side,
      a,
      b,
      [slab.bottom, slab.bottom],
      [slab.top, slab.top],
      [-inward[0], -inward[1]],
      light,
    );
  });
}

/**
 * Desplaza hacia dentro cada arista de un polígono convexo antihorario su propia distancia
 * (`distances[i]` para la arista i → i+1). Cada vértice queda en el cruce de sus dos aristas
 * desplazadas.
 */
function insetEdges(points: Point2[], distances: number[]): Point2[] {
  const n = points.length;
  return points.map((p, i) => {
    const prevIndex = (i - 1 + n) % n;
    const n1 = interiorNormal(points[prevIndex]!, p);
    const n2 = interiorNormal(p, points[(i + 1) % n]!);
    const d1 = distances[prevIndex]!;
    const d2 = distances[i]!;
    // Desplazamiento x con x·n1 = d1 y x·n2 = d2.
    const det = n1[0] * n2[1] - n1[1] * n2[0];
    if (Math.abs(det) < 1e-9) return [p[0] + n1[0] * d1, p[1] + n1[1] * d1];
    const x = (d1 * n2[1] - d2 * n1[1]) / det;
    const z = (n1[0] * d2 - n2[0] * d1) / det;
    return [p[0] + x, p[1] + z];
  });
}

/** Luz del sector que contiene el primer triángulo de un polígono (un punto seguro en su interior). */
function lightInside(level: LevelData, flat: Point2[], triangles: number[]): number {
  const [i, j, k] = triangles;
  if (i === undefined || j === undefined || k === undefined) return 1;
  const x = (flat[i]![0] + flat[j]![0] + flat[k]![0]) / 3;
  const z = (flat[i]![1] + flat[j]![1] + flat[k]![1]) / 3;
  return findSectorAt(level, x, z)?.light ?? 1;
}

/**
 * Prisma de una puerta o un ascensor. La puerta ocupa desde el suelo hasta su altura abierta
 * (cerrada) y sube ese recorrido; el ascensor ocupa desde su altura baja hasta su suelo
 * (arriba) y baja ese recorrido. Las caras laterales solo se generan hacia sectores vecinos:
 * contra paredes sólidas nunca se ven.
 */
function buildMover(
  level: LevelData,
  sector: SectorData,
  edgeSides: Map<string, EdgeSide[]>,
): MoverGeometry {
  const special = sector.special;
  if (special?.type !== 'door' && special?.type !== 'lift') {
    throw new Error(`El sector ${sector.index} no es una puerta ni un ascensor`);
  }
  const writer = new MeshWriter(null);
  const exact = ringPoints(level, sector.outer);
  const neighbours = sector.outer.map((ia, i) => {
    const ib = sector.outer[(i + 1) % sector.outer.length]!;
    const key = ia < ib ? `${ia}:${ib}` : `${ib}:${ia}`;
    return edgeSides.get(key)?.find((side) => side.sector !== sector)?.sector;
  });
  // Solo se retranquean las caras que dan a sectores vecinos (las que podrían coincidir con una
  // pared estática); contra las jambas no hace falta y dejaría una rendija.
  const points = insetEdges(
    exact,
    neighbours.map((neighbour) => (neighbour ? MOVER_INSET : 0)),
  );
  const isDoor = special.type === 'door';
  const bottomY = isDoor ? sector.floor.height : special.lowHeight;
  const topY = isDoor ? sector.ceiling.height : sector.floor.height;
  // Faldón oculto: la puerta sigue por encima de su altura y el ascensor por debajo, para que
  // la rendija del retranqueo nunca deje ver lo que hay detrás.
  const visualBottom = isDoor ? bottomY : bottomY - MOVER_SKIRT;
  const visualTop = isDoor ? topY + MOVER_SKIRT : topY;

  // Las tapas usan el contorno exacto: nunca coinciden con una pared y así no dejan rendijas.
  const { flat, triangles } = triangulate([exact]);
  if (isDoor) {
    const texture = special.hidden ? sector.ceiling.texture : special.texture;
    const bottomFace = flat.map(([x, z]): P3 => [x, bottomY, z]);
    writer.addPolygon(texture, bottomFace, triangles, DOWN, floorUv, sector.light);
    const topFace = flat.map(([x, z]): P3 => [x, visualTop, z]);
    writer.addPolygon(texture, topFace, triangles, UP, floorUv, sector.light);
  } else {
    const face = flat.map(([x, z]): P3 => [x, topY, z]);
    writer.addPolygon(sector.floor.texture, face, triangles, UP, floorUv, sector.light);
  }

  neighbours.forEach((neighbour, i) => {
    if (!neighbour) return;
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const inward = interiorNormal(a, b);
    const hidden = special.type === 'door' && special.hidden;
    const texture = hidden ? neighbour.walls.middle : special.texture;
    // Las puertas visibles llevan la textura ajustada a la hoja (franja de peligro abajo);
    // las secretas usan coordenadas del mundo para confundirse con la pared de alrededor.
    const edgeLength = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const fitted: UvFn | undefined =
      isDoor && !hidden
        ? (p) => [
            Math.hypot(p[0] - a[0], p[2] - a[1]) / edgeLength,
            (p[1] - bottomY) / (topY - bottomY),
          ]
        : undefined;
    addWall(
      writer,
      texture,
      a,
      b,
      [visualBottom, visualBottom],
      [visualTop, visualTop],
      [-inward[0], -inward[1]],
      neighbour.light,
      false,
      fitted,
    );
  });

  // El collider usa el contorno exacto: la puerta cerrada no deja rendijas.
  const hullPoints: number[] = [];
  for (const [x, z] of exact) hullPoints.push(x, bottomY, z, x, topY, z);

  return {
    sectorIndex: sector.index,
    kind: special.type,
    batches: writer.batches,
    hullPoints,
    travel: isDoor ? topY - bottomY : -(topY - bottomY),
  };
}
