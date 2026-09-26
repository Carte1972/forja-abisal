import type RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { GROUP, interactionGroups, SOLID_WORLD } from '../../engine/physics/collision_groups';
import type { PhysicsWorld, Vec3 } from '../../engine/physics/physics_world';
import type { ParticleSystem } from '../../engine/render/particle_system';

export type ProjectileKind = 'charge' | 'bouncer';

interface Projectile {
  kind: ProjectileKind;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  mesh: THREE.Mesh;
  age: number;
  damage: number;
  /** Dirección de vuelo en el último paso (para orientar la marca de la explosión). */
  heading: Vec3;
  exploding: boolean;
}

export interface ExplosionRequest {
  position: Vec3;
  heading: Vec3;
  damage: number;
  radius: number;
}

const SPECS = {
  charge: { speed: 30, radius: 0.12, gravityScale: 0, restitution: 0, lifetime: 6, fuse: Infinity },
  bouncer: { speed: 17, radius: 0.14, gravityScale: 1, restitution: 0.45, lifetime: 6, fuse: 1.6 },
} as const;

export const EXPLOSION_RADIUS = 4.5;
/** Los proyectiles chocan con el nivel y los enemigos, pero atraviesan a quien dispara. */
const PROJECTILE_GROUPS = interactionGroups(GROUP.PROJECTILE, SOLID_WORLD);

/**
 * Proyectiles con física propia (cuerpos dinámicos de Rapier con CCD): la carga vuela recta y
 * estalla al tocar cualquier cosa; la rebotadora cae, rebota y estalla al acabar la espoleta
 * o al tocar a un enemigo.
 */
export class ProjectileSystem {
  readonly group = new THREE.Group();
  private readonly projectiles: Projectile[] = [];
  private readonly byCollider = new Map<number, Projectile>();
  private readonly chargeMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xffa040).multiplyScalar(6),
  });
  private readonly bouncerMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2c30,
    emissive: new THREE.Color(0xff2010),
    emissiveIntensity: 0,
    metalness: 0.5,
    roughness: 0.4,
  });
  private readonly chargeGeometry = new THREE.SphereGeometry(SPECS.charge.radius, 10, 8);
  private readonly bouncerGeometry = new THREE.IcosahedronGeometry(SPECS.bouncer.radius, 0);

  constructor(
    private readonly physics: PhysicsWorld,
    private readonly particles: ParticleSystem,
    private readonly onExplode: (request: ExplosionRequest) => void,
  ) {
    this.group.name = 'projectiles';
  }

  get count(): number {
    return this.projectiles.length;
  }

  spawn(kind: ProjectileKind, origin: Vec3, direction: Vec3, damage: number): void {
    const spec = SPECS[kind];
    const { body, collider } = this.physics.addDynamicSphere(origin, spec.radius, {
      gravityScale: spec.gravityScale,
      restitution: spec.restitution,
      groups: PROJECTILE_GROUPS,
    });
    // La rebotadora sale con algo de elevación para trazar una parábola.
    const lift = kind === 'bouncer' ? 3 : 0;
    body.setLinvel(
      {
        x: direction.x * spec.speed,
        y: direction.y * spec.speed + lift,
        z: direction.z * spec.speed,
      },
      true,
    );
    if (kind === 'bouncer') body.setAngvel({ x: 8, y: 3, z: 2 }, true);
    const mesh = new THREE.Mesh(
      kind === 'charge' ? this.chargeGeometry : this.bouncerGeometry,
      kind === 'charge' ? this.chargeMaterial : this.bouncerMaterial.clone(),
    );
    mesh.position.set(origin.x, origin.y, origin.z);
    this.group.add(mesh);
    const projectile: Projectile = {
      kind,
      body,
      collider,
      mesh,
      age: 0,
      damage,
      heading: { ...direction },
      exploding: false,
    };
    this.projectiles.push(projectile);
    this.byCollider.set(collider.handle, projectile);
  }

  /** Llamar con cada contacto nuevo que informe la física. */
  handleCollision(handle1: number, handle2: number): void {
    for (const [mine, other] of [
      [handle1, handle2],
      [handle2, handle1],
    ] as const) {
      const projectile = this.byCollider.get(mine);
      if (!projectile) continue;
      if (projectile.kind === 'charge') {
        projectile.exploding = true;
        continue;
      }
      const otherCollider = this.physics.world.getCollider(other);
      const membership = otherCollider ? otherCollider.collisionGroups() >>> 16 : 0;
      if (membership & GROUP.ENEMY) projectile.exploding = true;
    }
  }

  update(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      const spec = SPECS[p.kind];
      p.age += dt;
      const position = p.body.translation();
      const velocity = p.body.linvel();
      const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
      if (speed > 0.5) {
        p.heading = { x: velocity.x / speed, y: velocity.y / speed, z: velocity.z / speed };
      }
      p.mesh.position.set(position.x, position.y, position.z);
      const rotation = p.body.rotation();
      p.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

      if (p.kind === 'charge') {
        this.particles.ember(position);
        if (Math.random() < 0.5) this.particles.smoke(position, 1, 0.12);
      } else {
        // Parpadeo rojo cada vez más rápido según se acaba la espoleta.
        const material = p.mesh.material as THREE.MeshStandardMaterial;
        const rate = 4 + (p.age / spec.fuse) * 16;
        material.emissiveIntensity = Math.sin(p.age * rate * Math.PI) > 0 ? 4 : 0.2;
      }

      if (p.exploding || p.age >= spec.fuse || p.age >= spec.lifetime) {
        this.remove(i);
        this.onExplode({
          position: { x: position.x, y: position.y, z: position.z },
          heading: p.heading,
          damage: p.damage,
          radius: EXPLOSION_RADIUS,
        });
      }
    }
  }

  dispose(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) this.remove(i);
    this.chargeGeometry.dispose();
    this.bouncerGeometry.dispose();
    this.chargeMaterial.dispose();
    this.bouncerMaterial.dispose();
  }

  private remove(index: number): void {
    const p = this.projectiles[index]!;
    this.projectiles.splice(index, 1);
    this.byCollider.delete(p.collider.handle);
    this.physics.removeBody(p.body);
    this.group.remove(p.mesh);
    if (p.kind === 'bouncer') (p.mesh.material as THREE.Material).dispose();
  }
}
