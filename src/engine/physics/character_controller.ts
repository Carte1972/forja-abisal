import RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsWorld, Vec3 } from './physics_world';

export interface CapsuleDimensions {
  radius: number;
  standHeight: number;
  crouchHeight: number;
}

export interface MoveResult {
  movement: Vec3;
  grounded: boolean;
  /** Normales horizontales de las paredes contra las que ha chocado (sin suelos ni rampas). */
  wallNormals: Vec3[];
}

/** Por debajo de esta componente vertical, una normal de contacto se considera pared. */
const WALL_NORMAL_MAX_Y = 0.3;

const IDENTITY_ROTATION = { x: 0, y: 0, z: 0, w: 1 };

/**
 * Cápsula cinemática movida por el KinematicCharacterController de Rapier.
 * El cuerpo está en los pies y el collider va desplazado hacia arriba, así al
 * agacharse o levantarse los pies no se mueven.
 */
export class CharacterBody {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  private readonly controller: RAPIER.KinematicCharacterController;
  private readonly feet: Vec3;
  private crouchedState = false;

  constructor(
    private readonly physics: PhysicsWorld,
    spawnFeet: Vec3,
    private readonly dims: CapsuleDimensions,
  ) {
    const { world } = physics;
    this.feet = { ...spawnFeet };
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        spawnFeet.x,
        spawnFeet.y,
        spawnFeet.z,
      ),
    );
    const offsetY = this.colliderOffsetY(dims.standHeight);
    this.collider = world.createCollider(
      RAPIER.ColliderDesc.capsule(this.halfHeight(dims.standHeight), dims.radius).setTranslation(
        0,
        offsetY,
        0,
      ),
      this.body,
    );

    this.controller = world.createCharacterController(0.02);
    this.controller.setUp({ x: 0, y: 1, z: 0 });
    this.controller.setSlideEnabled(true);
    this.controller.enableAutostep(0.45, 0.15, false);
    this.controller.enableSnapToGround(0.4);
    this.controller.setMaxSlopeClimbAngle((46 * Math.PI) / 180);
    this.controller.setMinSlopeSlideAngle((50 * Math.PI) / 180);
    this.controller.setApplyImpulsesToDynamicBodies(true);
  }

  get feetPosition(): Readonly<Vec3> {
    return this.feet;
  }

  get crouched(): boolean {
    return this.crouchedState;
  }

  get height(): number {
    return this.crouchedState ? this.dims.crouchHeight : this.dims.standHeight;
  }

  /** Intenta mover la cápsula `desired` metros; devuelve el movimiento real tras las colisiones. */
  move(desired: Vec3): MoveResult {
    this.controller.computeColliderMovement(this.collider, desired);
    const m = this.controller.computedMovement();
    this.feet.x += m.x;
    this.feet.y += m.y;
    this.feet.z += m.z;
    this.body.setNextKinematicTranslation(this.feet);

    const wallNormals: Vec3[] = [];
    for (let i = 0; i < this.controller.numComputedCollisions(); i++) {
      const n = this.controller.computedCollision(i)?.normal1;
      if (!n || Math.abs(n.y) > WALL_NORMAL_MAX_Y) continue;
      const length = Math.hypot(n.x, n.z);
      if (length > 1e-6) wallNormals.push({ x: n.x / length, y: 0, z: n.z / length });
    }
    return {
      movement: { x: m.x, y: m.y, z: m.z },
      grounded: this.controller.computedGrounded(),
      wallNormals,
    };
  }

  /** Cambia entre de pie y agachado. Devuelve el estado final (no se levanta si no cabe). */
  setCrouched(crouch: boolean): boolean {
    if (crouch === this.crouchedState) return this.crouchedState;
    if (!crouch && !this.hasHeadroom()) return this.crouchedState;
    this.crouchedState = crouch;
    this.applyShape(crouch ? this.dims.crouchHeight : this.dims.standHeight);
    return this.crouchedState;
  }

  teleport(feet: Vec3): void {
    this.feet.x = feet.x;
    this.feet.y = feet.y;
    this.feet.z = feet.z;
    this.body.setTranslation(this.feet, true);
    this.syncColliderPose();
  }

  dispose(): void {
    this.physics.world.removeCharacterController(this.controller);
    this.physics.world.removeRigidBody(this.body);
  }

  private hasHeadroom(): boolean {
    const height = this.dims.standHeight;
    // Radio un poco menor para no detectar las paredes que ya tocamos de lado.
    const shape = new RAPIER.Capsule(this.halfHeight(height), this.dims.radius * 0.9);
    const center = {
      x: this.feet.x,
      y: this.feet.y + this.colliderOffsetY(height) + 0.02,
      z: this.feet.z,
    };
    const hit = this.physics.world.intersectionWithShape(
      center,
      IDENTITY_ROTATION,
      shape,
      undefined,
      undefined,
      this.collider,
    );
    return hit === null;
  }

  private applyShape(height: number): void {
    this.collider.setHalfHeight(this.halfHeight(height));
    this.collider.setTranslationWrtParent({ x: 0, y: this.colliderOffsetY(height), z: 0 });
    this.syncColliderPose();
  }

  /**
   * La pose del collider solo se recalcula en world.step(); la fijamos ya para que el
   * controlador no use la posición antigua con la forma nueva en el siguiente movimiento.
   */
  private syncColliderPose(): void {
    this.collider.setTranslation({
      x: this.feet.x,
      y: this.feet.y + this.colliderOffsetY(this.height),
      z: this.feet.z,
    });
  }

  private halfHeight(height: number): number {
    return Math.max(height / 2 - this.dims.radius, 0.01);
  }

  private colliderOffsetY(height: number): number {
    return height / 2;
  }
}
