import { init, NavMeshQuery, type NavMesh } from 'recast-navigation';
import { generateSoloNavMesh } from 'recast-navigation/generators';
import type { Vec3 } from '../physics/physics_world';

let initPromise: Promise<void> | null = null;

/** Carga el módulo WASM de recast una sola vez (versión con el WASM embebido). */
export function initNavigation(): Promise<void> {
  initPromise ??= init();
  return initPromise;
}

/** Dimensiones del agente de referencia (las mismas que la cápsula de los enemigos de a pie). */
export const AGENT = { radius: 0.4, height: 1.8, climb: 0.45, maxSlope: 46 };
const CELL = 0.2;
const CELL_HEIGHT = 0.1;

/**
 * Malla de navegación generada con recast a partir de la geometría de colisión del nivel.
 * Los enemigos de a pie la usan para encontrar caminos; el volador no.
 */
export class Navigation {
  private readonly query: NavMeshQuery;

  private constructor(private readonly navMesh: NavMesh) {
    this.query = new NavMeshQuery(navMesh);
    this.query.defaultQueryHalfExtents = { x: 1, y: 2, z: 1 };
  }

  static build(positions: ArrayLike<number>, indices: ArrayLike<number>): Navigation {
    const result = generateSoloNavMesh(positions, indices, {
      cs: CELL,
      ch: CELL_HEIGHT,
      walkableSlopeAngle: AGENT.maxSlope,
      walkableHeight: Math.ceil(AGENT.height / CELL_HEIGHT),
      walkableClimb: Math.floor(AGENT.climb / CELL_HEIGHT),
      walkableRadius: Math.ceil(AGENT.radius / CELL),
      maxEdgeLen: 12 / CELL,
      maxSimplificationError: 1.3,
      minRegionArea: 8,
      mergeRegionArea: 20,
      maxVertsPerPoly: 6,
      detailSampleDist: 6 * CELL,
      detailSampleMaxError: CELL_HEIGHT,
    });
    if (!result.success) throw new Error('No se pudo generar la malla de navegación');
    return new Navigation(result.navMesh);
  }

  /**
   * Camino (lista de puntos, sin incluir el origen) desde `from` hasta `to`. Devuelve null si
   * no hay camino o si alguno de los extremos está fuera de la malla.
   */
  findPath(from: Vec3, to: Vec3): Vec3[] | null {
    const result = this.query.computePath(from, to);
    if (!result.success || result.path.length === 0) return null;
    const last = result.path[result.path.length - 1]!;
    // computePath llega al punto alcanzable más cercano: si queda lejos del destino, no hay camino.
    if (Math.hypot(last.x - to.x, last.z - to.z) > 1.5 || Math.abs(last.y - to.y) > 2.5)
      return null;
    return result.path.slice(1).map((p) => ({ x: p.x, y: p.y, z: p.z }));
  }

  /** Longitud del camino, o Infinity si no lo hay (para saber si un ruido llega "por los pasillos"). */
  pathLength(from: Vec3, to: Vec3): number {
    const path = this.findPath(from, to);
    if (!path) return Infinity;
    let length = 0;
    let previous = from;
    for (const point of path) {
      length += Math.hypot(point.x - previous.x, point.y - previous.y, point.z - previous.z);
      previous = point;
    }
    return length;
  }

  /** Punto de la malla más cercano, o null si no hay ninguno cerca. */
  closestPoint(position: Vec3): Vec3 | null {
    const result = this.query.findClosestPoint(position);
    return result.success && result.polyRef !== 0 ? { ...result.point } : null;
  }

  /** Punto aleatorio alcanzable dentro de un radio (para deambular). */
  randomPointAround(position: Vec3, radius: number): Vec3 | null {
    const result = this.query.findRandomPointAroundCircle(position, radius);
    return result.success ? { ...result.randomPoint } : null;
  }

  dispose(): void {
    this.query.destroy();
    this.navMesh.destroy();
  }
}
