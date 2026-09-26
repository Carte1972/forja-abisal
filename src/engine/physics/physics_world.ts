import RAPIER from '@dimforge/rapier3d-compat';
import { ALL_GROUPS, GROUP, interactionGroups } from './collision_groups';

export type Vec3 = { x: number; y: number; z: number };
export type Quat = { x: number; y: number; z: number; w: number };

export interface RayHit {
  point: Vec3;
  normal: Vec3;
  distance: number;
  collider: RAPIER.Collider;
}

let initPromise: Promise<void> | null = null;

/** Carga el módulo WASM de Rapier una sola vez. */
export function initPhysics(): Promise<void> {
  initPromise ??= RAPIER.init();
  return initPromise;
}

export class PhysicsWorld {
  readonly world: RAPIER.World;
  private readonly eventQueue = new RAPIER.EventQueue(true);

  constructor(timestep: number) {
    // La gravedad del jugador la aplica su propio controlador; esta afecta a los cuerpos dinámicos.
    this.world = new RAPIER.World({ x: 0, y: -20, z: 0 });
    this.world.timestep = timestep;
  }

  /** Malla de triángulos estática (geometría del nivel). */
  addStaticTrimesh(positions: Float32Array, indices: Uint32Array): RAPIER.Collider {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    // FIX_INTERNAL_EDGES evita "baches" al deslizar sobre aristas entre triángulos coplanares.
    const desc = RAPIER.ColliderDesc.trimesh(
      positions,
      indices,
      RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES,
    ).setCollisionGroups(interactionGroups(GROUP.STATIC, ALL_GROUPS));
    return this.world.createCollider(desc, body);
  }

  /** Cuerpo cinemático con un collider convexo (puertas, ascensores). */
  addKinematicConvexHull(points: Float32Array): RAPIER.RigidBody {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
    const desc = RAPIER.ColliderDesc.convexHull(points);
    if (!desc) throw new Error('No se pudo crear el collider convexo');
    this.world.createCollider(
      desc.setCollisionGroups(interactionGroups(GROUP.MOVER, ALL_GROUPS)),
      body,
    );
    return body;
  }

  /**
   * Esfera dinámica con detección continua de colisiones (para que un proyectil rápido no
   * atraviese paredes finas) que avisa de sus contactos.
   */
  addDynamicSphere(
    position: Vec3,
    radius: number,
    options: { gravityScale: number; restitution: number; groups: number },
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .setGravityScale(options.gravityScale)
        .setCcdEnabled(true),
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.ball(radius)
        .setRestitution(options.restitution)
        .setFriction(0.6)
        .setDensity(2)
        .setCollisionGroups(options.groups)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body,
    );
    return { body, collider };
  }

  /**
   * Rayo desde `origin` en la dirección `dir` (normalizada) hasta `maxDistance`. `groups` decide
   * qué puede tocar; `exclude` ignora un collider concreto (p. ej. el del propio tirador).
   */
  castRay(
    origin: Vec3,
    dir: Vec3,
    maxDistance: number,
    groups: number,
    exclude?: RAPIER.Collider,
  ): RayHit | null {
    const hit = this.world.castRayAndGetNormal(
      new RAPIER.Ray(origin, dir),
      maxDistance,
      true,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      groups,
      exclude,
    );
    if (!hit) return null;
    const distance = hit.timeOfImpact;
    return {
      point: {
        x: origin.x + dir.x * distance,
        y: origin.y + dir.y * distance,
        z: origin.z + dir.z * distance,
      },
      normal: { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z },
      distance,
      collider: hit.collider,
    };
  }

  removeBody(body: RAPIER.RigidBody): void {
    this.world.removeRigidBody(body);
  }

  /** Avanza la simulación y entrega los contactos que han empezado en este paso. */
  step(onCollision?: (handle1: number, handle2: number) => void): void {
    this.world.step(this.eventQueue);
    this.eventQueue.drainCollisionEvents((h1, h2, started) => {
      if (started) onCollision?.(h1, h2);
    });
  }

  dispose(): void {
    this.eventQueue.free();
    this.world.free();
  }
}
