import RAPIER from '@dimforge/rapier3d-compat';

export type Vec3 = { x: number; y: number; z: number };
export type Quat = { x: number; y: number; z: number; w: number };

let initPromise: Promise<void> | null = null;

/** Carga el módulo WASM de Rapier una sola vez. */
export function initPhysics(): Promise<void> {
  initPromise ??= RAPIER.init();
  return initPromise;
}

export class PhysicsWorld {
  readonly world: RAPIER.World;

  constructor(timestep: number) {
    // La gravedad del jugador la aplica su propio controlador; esta afecta a los cuerpos dinámicos.
    this.world = new RAPIER.World({ x: 0, y: -20, z: 0 });
    this.world.timestep = timestep;
  }

  addStaticBox(center: Vec3, halfExtents: Vec3, rotation?: Quat): RAPIER.Collider {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(center.x, center.y, center.z);
    if (rotation) bodyDesc.setRotation(rotation);
    const body = this.world.createRigidBody(bodyDesc);
    return this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z),
      body,
    );
  }

  /** Malla de triángulos estática (geometría del nivel). */
  addStaticTrimesh(positions: Float32Array, indices: Uint32Array): RAPIER.Collider {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    // FIX_INTERNAL_EDGES evita "baches" al deslizar sobre aristas entre triángulos coplanares.
    const desc = RAPIER.ColliderDesc.trimesh(
      positions,
      indices,
      RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES,
    );
    return this.world.createCollider(desc, body);
  }

  /** Cuerpo cinemático con un collider convexo (puertas, ascensores). */
  addKinematicConvexHull(points: Float32Array): RAPIER.RigidBody {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
    const desc = RAPIER.ColliderDesc.convexHull(points);
    if (!desc) throw new Error('No se pudo crear el collider convexo');
    this.world.createCollider(desc, body);
    return body;
  }

  removeBody(body: RAPIER.RigidBody): void {
    this.world.removeRigidBody(body);
  }

  step(): void {
    this.world.step();
  }

  dispose(): void {
    this.world.free();
  }
}
