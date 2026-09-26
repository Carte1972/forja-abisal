import * as THREE from 'three';
import { GROUP, interactionGroups, SOLID_WORLD } from '../../engine/physics/collision_groups';
import type { PhysicsWorld, Vec3 } from '../../engine/physics/physics_world';
import type { ParticleSystem } from '../../engine/render/particle_system';
import type { DamageRegistry } from '../rules/damage';
import type { Enemy } from './enemy';

type Kind = 'acid' | 'bolt';

interface Shot {
  kind: Kind;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  owner: Enemy;
  age: number;
  mesh: THREE.Mesh;
}

const MAX_AGE = 5;
const ACID_GRAVITY = -6;
/** Los proyectiles enemigos tocan el nivel, al jugador y a otros enemigos. */
const SHOT_GROUPS = interactionGroups(GROUP.HITSCAN, SOLID_WORLD | GROUP.PLAYER);
const COLORS: Record<Kind, number> = { acid: 0x9cff30, bolt: 0x50e8ff };

/**
 * Proyectiles de los enemigos: bolas de ácido (con algo de caída) y descargas de energía (rectas).
 * Avanzan con su propia integración y en cada paso lanzan un rayo entre la posición anterior y
 * la nueva, así que no atraviesan paredes aunque vayan rápido.
 */
export class EnemyProjectiles {
  readonly group = new THREE.Group();
  private readonly shots: Shot[] = [];
  private readonly geometry = new THREE.IcosahedronGeometry(0.16, 1);
  private readonly materials: Record<Kind, THREE.MeshBasicMaterial>;
  private readonly step = new THREE.Vector3();

  constructor(
    private readonly physics: PhysicsWorld,
    private readonly particles: ParticleSystem,
    private readonly damage: DamageRegistry,
    private readonly onImpact?: (kind: Kind, point: Vec3) => void,
  ) {
    this.group.name = 'enemy_projectiles';
    this.materials = {
      acid: new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS.acid).multiplyScalar(3) }),
      bolt: new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS.bolt).multiplyScalar(4) }),
    };
  }

  get count(): number {
    return this.shots.length;
  }

  spawn(
    kind: Kind,
    origin: Vec3,
    direction: Vec3,
    speed: number,
    damage: number,
    owner: Enemy,
  ): void {
    const mesh = new THREE.Mesh(this.geometry, this.materials[kind]);
    mesh.scale.setScalar(kind === 'acid' ? 1.1 : 0.7);
    mesh.position.set(origin.x, origin.y, origin.z);
    this.group.add(mesh);
    this.shots.push({
      kind,
      position: new THREE.Vector3(origin.x, origin.y, origin.z),
      velocity: new THREE.Vector3(direction.x, direction.y, direction.z).multiplyScalar(speed),
      damage,
      owner,
      age: 0,
      mesh,
    });
  }

  update(dt: number): void {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const shot = this.shots[i]!;
      shot.age += dt;
      if (shot.kind === 'acid') shot.velocity.y += ACID_GRAVITY * dt;
      this.step.copy(shot.velocity).multiplyScalar(dt);
      const distance = this.step.length();
      const dir = this.step.clone().divideScalar(distance || 1);
      const hit =
        distance > 0
          ? this.physics.castRay(
              shot.position,
              dir,
              distance,
              SHOT_GROUPS,
              shot.owner.body?.collider,
            )
          : null;
      if (hit) {
        this.impact(shot, hit.point, hit.normal, dir, hit.collider.handle);
        this.remove(i);
        continue;
      }
      shot.position.add(this.step);
      shot.mesh.position.copy(shot.position);
      if (shot.kind === 'acid') this.particles.smoke(shot.position, 1, 0.08);
      if (shot.age > MAX_AGE) this.remove(i);
    }
  }

  dispose(): void {
    for (let i = this.shots.length - 1; i >= 0; i--) this.remove(i);
    this.geometry.dispose();
    this.materials.acid.dispose();
    this.materials.bolt.dispose();
  }

  private impact(shot: Shot, point: Vec3, normal: Vec3, dir: THREE.Vector3, handle: number): void {
    const target = this.damage.lookup(handle);
    if (target?.alive) {
      target.applyDamage({
        amount: shot.damage,
        point,
        direction: { x: dir.x, y: dir.y, z: dir.z },
        knockback: 2,
        source: 'enemy',
        attacker: shot.owner,
      });
    }
    this.onImpact?.(shot.kind, point);
    // Salpicadura del color del proyectil.
    this.particles.blood(point, normal, COLORS[shot.kind], 10);
    this.particles.sparks(point, normal, shot.kind === 'bolt' ? 8 : 2);
  }

  private remove(index: number): void {
    const shot = this.shots[index]!;
    this.group.remove(shot.mesh);
    this.shots.splice(index, 1);
  }
}
