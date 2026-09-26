import * as THREE from 'three';
import type { Navigation } from '../../engine/ai/navmesh';
import type { EventBus } from '../../engine/core/event_bus';
import type { Rng } from '../../engine/core/rng';
import type { LoadedLevel } from '../../engine/level/level_builder';
import { thingHeight } from '../../engine/level/level_builder';
import { GROUP, interactionGroups, SOLID_WORLD } from '../../engine/physics/collision_groups';
import type { PhysicsWorld, Vec3 } from '../../engine/physics/physics_world';
import type { DecalSystem } from '../../engine/render/decal_system';
import type { LightSystem } from '../../engine/render/light_system';
import type { ParticleSystem } from '../../engine/render/particle_system';
import type { GameEvents } from '../game_events';
import type { DamageRegistry } from '../rules/damage';
import { stepAi, type AiCommand, type AiState } from './ai_state_machine';
import { Enemy, type Combatant, type EnemySpawn } from './enemy';
import { ENEMIES, isEnemyKind, type EnemyDef } from './enemy_defs';
import { animateRig, disposeRig, type RigPose } from './enemy_models';
import { EnemyProjectiles } from './enemy_projectiles';
import { inViewCone, turnTowards, yawTowards } from './perception';

/** La vista solo la tapan el nivel y las puertas, no otros enemigos. */
const SIGHT_GROUPS = interactionGroups(GROUP.HITSCAN, GROUP.STATIC | GROUP.MOVER);
/** Los disparos de los enemigos tocan el nivel, al jugador y a otros enemigos. */
const SHOT_GROUPS = interactionGroups(GROUP.HITSCAN, SOLID_WORLD | GROUP.PLAYER);
const GRAVITY = 20;
const TURN_SPEED = 7;
const REPATH_INTERVAL = 0.5;
const DIRECT_CHASE_DISTANCE = 4;
const PASSIVE: readonly AiState[] = ['idle', 'patrol'];

export interface EnemySystemDeps {
  physics: PhysicsWorld;
  navigation: Navigation | null;
  scene: THREE.Scene;
  particles: ParticleSystem;
  lights: LightSystem;
  decals: DecalSystem;
  damage: DamageRegistry;
  bus: EventBus<GameEvents>;
  rng: Rng;
  level: LoadedLevel;
  player: Combatant;
  /** Abre la puerta (sin llave) que haya en ese punto, si la hay. */
  openDoorAt?: (point: Vec3) => void;
}

/**
 * Ciclo de vida y comportamiento de los enemigos: percepción (cono de visión con raycast y
 * ruido propagado por la malla de navegación), IA (ai_state_machine), navegación (recast),
 * ataques, peleas entre ellos y animación.
 */
export class EnemySystem {
  readonly enemies: Enemy[] = [];
  readonly group = new THREE.Group();
  readonly projectiles: EnemyProjectiles;
  private readonly unsubscribe: () => void;
  private time = 0;
  private readonly muzzle = new THREE.Vector3();

  constructor(private readonly deps: EnemySystemDeps) {
    this.group.name = 'enemies';
    this.projectiles = new EnemyProjectiles(deps.physics, deps.particles, deps.damage);
    deps.scene.add(this.group, this.projectiles.group);
    this.unsubscribe = deps.bus.on('noise', ({ position, radius }) => this.hear(position, radius));
  }

  get aliveCount(): number {
    return this.enemies.filter((enemy) => enemy.alive).length;
  }

  spawnFromLevel(): void {
    const { data } = this.deps.level;
    for (const thing of data.things) {
      if (thing.type !== 'enemy') continue;
      const kind = thing.properties.kind;
      if (!isEnemyKind(kind)) {
        console.warn(`Enemigo desconocido "${String(kind)}" en (${thing.position.join(', ')})`);
        continue;
      }
      const def = ENEMIES[kind];
      const floor = thingHeight(data, thing);
      const patrol = readPatrol(thing.properties.patrol).map(([x, z]) => ({ x, y: floor, z }));
      this.spawn(def, {
        position: { x: thing.position[0], y: floor + (def.hover ?? 0), z: thing.position[1] },
        yaw: thing.angle,
        patrol:
          patrol.length > 0
            ? [{ x: thing.position[0], y: floor, z: thing.position[1] }, ...patrol]
            : [],
      });
    }
  }

  spawn(def: EnemyDef, spawn: EnemySpawn): Enemy {
    const enemy = new Enemy(def, spawn, this.deps.physics, this.deps.player, this.deps.rng);
    // Cada enemigo empieza a mirar en un momento distinto para repartir el trabajo.
    enemy.sightTimer = this.deps.rng.range(0, 0.2);
    enemy.repathTimer = this.deps.rng.range(0, REPATH_INTERVAL);
    this.deps.damage.register(enemy.colliderHandle, enemy);
    this.group.add(enemy.rig.root);
    this.enemies.push(enemy);
    return enemy;
  }

  fixedUpdate(dt: number): void {
    this.time += dt;
    for (const enemy of this.enemies) {
      enemy.prevFeet.copy(enemy.currFeet);
      if (!enemy.alive && enemy.memory.state === 'dead') {
        enemy.memory.stateTime += dt;
        continue;
      }
      this.think(enemy, dt);
      const feet = enemy.feet;
      enemy.currFeet.set(feet.x, feet.y, feet.z);
    }
    this.projectiles.update(dt);
  }

  /** Posición interpolada, orientación y animación, en cada frame. */
  render(alpha: number, dt: number): void {
    for (const enemy of this.enemies) {
      const root = enemy.rig.root;
      root.position.lerpVectors(enemy.prevFeet, enemy.currFeet, alpha);
      root.rotation.y = enemy.yaw;
      const speed = Math.hypot(enemy.velocity.x, enemy.velocity.z);
      enemy.walkPhase += dt * speed * (enemy.def.kind === 'crawler' ? 2.4 : 2);
      enemy.flash = Math.max(0, enemy.flash - dt * 6);
      const state = enemy.memory.state;
      const pose: RigPose =
        state === 'dead'
          ? 'dead'
          : state === 'attack'
            ? 'attack'
            : state === 'pain'
              ? 'pain'
              : speed > 0.3
                ? 'walk'
                : 'idle';
      const ai = enemy.def.ai;
      animateRig(
        enemy.rig,
        {
          pose,
          poseTime: enemy.memory.stateTime,
          poseDuration:
            pose === 'attack' ? ai.attackDuration : pose === 'pain' ? ai.painDuration : 0,
          speed,
          time: this.time,
          flash: enemy.flash,
          deathDrop: enemy.deathDrop,
        },
        enemy.walkPhase,
      );
    }
  }

  dispose(): void {
    this.unsubscribe();
    for (const enemy of this.enemies) {
      enemy.body?.dispose();
      disposeRig(enemy.rig);
    }
    this.enemies.length = 0;
    this.projectiles.dispose();
    this.deps.scene.remove(this.group, this.projectiles.group);
  }

  private think(enemy: Enemy, dt: number): void {
    const { def } = enemy;
    // Si su rival ha muerto, vuelve a por el jugador.
    if (!enemy.target.alive && enemy.target !== enemy.defaultTarget) {
      enemy.target = enemy.defaultTarget;
      enemy.canSeeTarget = false;
    }
    const target = enemy.target;
    const targetCenter = target.center();
    const eye = enemy.eye();
    const distance = Math.hypot(
      targetCenter.x - eye.x,
      targetCenter.y - eye.y,
      targetCenter.z - eye.z,
    );

    enemy.sightTimer -= dt;
    if (enemy.sightTimer <= 0) {
      enemy.sightTimer = 0.15 + this.deps.rng.range(0, 0.1);
      enemy.canSeeTarget = this.canSee(enemy, eye, targetCenter, distance);
    }

    const lastKnown = enemy.memory.lastKnown;
    const feet = enemy.feet;
    const reachedLastKnown =
      !lastKnown ||
      Math.hypot(lastKnown.x - feet.x, lastKnown.z - feet.z) < 1.2 ||
      enemy.stuckTime > 2;

    const command = stepAi(
      enemy.memory,
      {
        canSeeTarget: enemy.canSeeTarget,
        targetPosition: target.alive ? targetCenter : null,
        targetDistance: distance,
        heardNoiseAt: enemy.pendingNoise,
        damagedFrom: enemy.pendingDamageFrom,
        painTriggered: enemy.pendingPain,
        health: enemy.health,
        hasPatrol: enemy.spawn.patrol.length > 1,
        reachedLastKnown,
      },
      def.ai,
      dt,
    );
    enemy.pendingNoise = null;
    enemy.pendingDamageFrom = null;
    enemy.pendingPain = false;

    if (command.entered === 'dead') {
      this.die(enemy);
      return;
    }
    if (command.entered === 'chase' || command.entered === 'alert') enemy.path = [];

    this.move(enemy, command, targetCenter, distance, dt);
    this.face(enemy, command, targetCenter, dt);
    if (command.strike) this.attack(enemy, targetCenter);
  }

  private canSee(enemy: Enemy, eye: Vec3, target: Vec3, distance: number): boolean {
    if (!enemy.target.alive || distance > enemy.def.sightRange) return false;
    // Una vez alerta ve en todas direcciones; en reposo solo dentro de su cono de visión.
    const alerted = !PASSIVE.includes(enemy.memory.state);
    if (!alerted && !inViewCone(eye, enemy.yaw, target, enemy.def.fov, enemy.def.sightRange)) {
      return false;
    }
    return this.lineOfSight(eye, target);
  }

  private lineOfSight(from: Vec3, to: Vec3): boolean {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance < 0.01) return true;
    const dir = { x: dx / distance, y: dy / distance, z: dz / distance };
    return this.deps.physics.castRay(from, dir, distance - 0.05, SIGHT_GROUPS) === null;
  }

  /** Un ruido alerta a los enemigos en reposo que lo oyen a través de los pasillos. */
  private hear(position: Vec3, radius: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive || !PASSIVE.includes(enemy.memory.state)) continue;
      const center = enemy.center();
      const direct = Math.hypot(
        center.x - position.x,
        center.y - position.y,
        center.z - position.z,
      );
      if (direct > radius) continue;
      const nav = this.deps.navigation;
      const heard =
        direct < radius * 0.35 ||
        this.lineOfSight(enemy.eye(), position) ||
        (nav !== null && nav.pathLength(enemy.feet, position) <= radius * 1.3);
      if (heard) enemy.pendingNoise = { ...position };
    }
  }

  private move(
    enemy: Enemy,
    command: AiCommand,
    targetCenter: Vec3,
    distance: number,
    dt: number,
  ): void {
    const body = enemy.body;
    if (!body) return;
    const { def } = enemy;
    const feet = { ...body.feetPosition };
    let goal: Vec3 | null = null;
    let direct = false;
    let speed = def.speed;

    switch (command.move) {
      case 'target':
        goal = targetCenter;
        direct = def.flying || (enemy.canSeeTarget && distance < DIRECT_CHASE_DISTANCE);
        // Los que atacan a distancia no se acercan más de lo necesario: se mueven de lado.
        if (def.attack.kind !== 'melee' && enemy.canSeeTarget && distance < def.preferredRange) {
          const side = Math.sin(this.time * 0.9 + enemy.colliderHandle) > 0 ? 1 : -1;
          const toTarget = Math.atan2(targetCenter.x - feet.x, targetCenter.z - feet.z);
          goal = {
            x: feet.x + Math.cos(toTarget) * side * 2,
            y: targetCenter.y,
            z: feet.z - Math.sin(toTarget) * side * 2,
          };
          direct = true;
          speed *= 0.5;
        }
        break;
      case 'lastKnown':
        goal = enemy.memory.lastKnown;
        break;
      case 'patrol': {
        const point = enemy.spawn.patrol[enemy.patrolIndex % enemy.spawn.patrol.length];
        if (point && Math.hypot(point.x - feet.x, point.z - feet.z) < 0.7) enemy.patrolIndex++;
        goal = enemy.spawn.patrol[enemy.patrolIndex % enemy.spawn.patrol.length] ?? null;
        speed *= 0.5;
        break;
      }
      case 'none':
        break;
    }

    let wishX = 0;
    let wishZ = 0;
    if (goal) {
      const waypoint = direct ? goal : this.nextWaypoint(enemy, feet, goal, dt);
      const dx = waypoint.x - feet.x;
      const dz = waypoint.z - feet.z;
      const length = Math.hypot(dx, dz);
      if (length > 0.15) {
        wishX = (dx / length) * speed;
        wishZ = (dz / length) * speed;
        // Si tiene una puerta delante, la abre (como haría el jugador).
        if (!def.flying) {
          this.deps.openDoorAt?.({
            x: feet.x + (dx / length) * (def.radius + 0.5),
            y: feet.y,
            z: feet.z + (dz / length) * (def.radius + 0.5),
          });
        }
      }
    }

    const v = enemy.velocity;
    const blend = Math.min(1, dt * 8);
    v.x += (wishX - v.x) * blend;
    v.z += (wishZ - v.z) * blend;
    if (def.flying) {
      // Mantiene la altura de vuelo sobre su objetivo (o sobre el suelo de su punto de destino).
      if (goal) {
        const desiredY = goal.y - def.height * 0.55 + (def.hover ?? 0);
        v.y = Math.max(-3, Math.min(3, (desiredY - feet.y) * 2));
      } else {
        v.y *= Math.exp(-dt * 4);
      }
    } else {
      v.y -= GRAVITY * dt;
    }
    const decay = Math.exp(-dt * 6);
    enemy.knock.x *= decay;
    enemy.knock.z *= decay;

    const desired = {
      x: (v.x + enemy.knock.x) * dt,
      y: v.y * dt,
      z: (v.z + enemy.knock.z) * dt,
    };
    const { movement, grounded } = body.move(desired);
    if (grounded && v.y < 0) v.y = 0;

    // Atasco: si quiere avanzar y apenas se mueve, recalcula el camino.
    const wanted = Math.hypot(wishX, wishZ) * dt;
    if (wanted > 0.01 && Math.hypot(movement.x, movement.z) < wanted * 0.2) {
      enemy.stuckTime += dt;
      if (enemy.stuckTime > 0.8) enemy.path = [];
      if (enemy.stuckTime > 1.5 && command.move === 'patrol') {
        enemy.patrolIndex++;
        enemy.stuckTime = 0;
      }
    } else {
      enemy.stuckTime = Math.max(0, enemy.stuckTime - dt * 2);
    }
  }

  /** Siguiente punto del camino por la malla de navegación hacia `goal`. */
  private nextWaypoint(enemy: Enemy, feet: Vec3, goal: Vec3, dt: number): Vec3 {
    const nav = this.deps.navigation;
    if (!nav) return goal;
    enemy.repathTimer -= dt;
    if (enemy.repathTimer <= 0 || enemy.path.length === 0) {
      enemy.repathTimer = REPATH_INTERVAL;
      enemy.path = nav.findPath(feet, goal) ?? [];
    }
    while (enemy.path.length > 0) {
      const next = enemy.path[0]!;
      if (Math.hypot(next.x - feet.x, next.z - feet.z) > 0.45) return next;
      enemy.path.shift();
    }
    return goal;
  }

  private face(enemy: Enemy, command: AiCommand, targetCenter: Vec3, dt: number): void {
    const feet = enemy.feet;
    let desired: number | null = null;
    if (command.face === 'target') desired = yawTowards(feet, targetCenter);
    else if (command.face === 'lastKnown' && enemy.memory.lastKnown) {
      desired = yawTowards(feet, enemy.memory.lastKnown);
    } else if (command.face === 'movement') {
      const v = enemy.velocity;
      if (Math.hypot(v.x, v.z) > 0.3) desired = Math.atan2(-v.x, -v.z);
    }
    if (desired !== null) enemy.yaw = turnTowards(enemy.yaw, desired, TURN_SPEED * dt);
  }

  private attack(enemy: Enemy, targetCenter: Vec3): void {
    const { def } = enemy;
    const { rng, particles, lights, bus, damage } = this.deps;
    const eye = enemy.eye();
    enemy.rig.root.updateMatrixWorld(true);
    enemy.rig.muzzle.getWorldPosition(this.muzzle);
    const muzzle = { x: this.muzzle.x, y: this.muzzle.y, z: this.muzzle.z };
    const attack = def.attack;
    bus.emit('noise', { position: eye, radius: attack.kind === 'melee' ? 6 : 25, source: 'enemy' });

    switch (attack.kind) {
      case 'hitscan': {
        lights.flash(muzzle, 0xffa050, 1.6, 6, 0.08);
        particles.smoke(muzzle, 1, 0.06);
        for (let i = 0; i < attack.shots; i++) {
          const dir = spreadDirection(eye, targetCenter, attack.spread, rng);
          const hit = this.deps.physics.castRay(
            eye,
            dir,
            def.sightRange,
            SHOT_GROUPS,
            enemy.body?.collider,
          );
          if (!hit) continue;
          const victim = damage.lookup(hit.collider.handle);
          if (victim?.alive) {
            victim.applyDamage({
              amount: attack.damage,
              point: hit.point,
              direction: dir,
              knockback: 1,
              source: 'enemy',
              attacker: enemy,
            });
            if (victim !== this.deps.player) particles.blood(hit.point, dir, victim.bloodColor, 8);
          } else {
            particles.sparks(hit.point, hit.normal, 5);
            if (hit.collider.handle === this.deps.level.staticColliderHandle) {
              this.deps.decals.bulletHole(hit.point, hit.normal, rng.next());
            }
          }
        }
        break;
      }
      case 'melee': {
        const center = enemy.center();
        const reach = Math.hypot(
          targetCenter.x - center.x,
          targetCenter.y - center.y,
          targetCenter.z - center.z,
        );
        if (
          reach <= attack.reach + 0.5 &&
          this.lineOfSight(eye, targetCenter) &&
          enemy.target.alive
        ) {
          const dir = normalize(targetCenter, center);
          enemy.target.applyDamage({
            amount: attack.damage,
            point: targetCenter,
            direction: dir,
            knockback: 3,
            source: 'enemy',
            attacker: enemy,
          });
          if (enemy.target !== this.deps.player) {
            particles.blood(targetCenter, dir, enemy.target.bloodColor, 14);
          }
        }
        break;
      }
      case 'projectile': {
        const dir = normalize(targetCenter, muzzle);
        this.projectiles.spawn(attack.projectile, muzzle, dir, attack.speed, attack.damage, enemy);
        lights.flash(muzzle, attack.projectile === 'acid' ? 0x9cff30 : 0x50e8ff, 1.2, 5, 0.12);
        break;
      }
    }
  }

  private die(enemy: Enemy): void {
    enemy.velocity = { x: 0, y: 0, z: 0 };
    enemy.path = [];
    const feet = enemy.feet;
    if (enemy.def.flying) {
      // El volador cae hasta el suelo que tenga debajo.
      const hit = this.deps.physics.castRay(feet, { x: 0, y: -1, z: 0 }, 20, SIGHT_GROUPS);
      enemy.deathDrop = hit ? -hit.distance : 0;
    }
    this.deps.damage.unregister(enemy.colliderHandle);
    enemy.body?.dispose();
    enemy.body = null;
    enemy.currFeet.set(feet.x, feet.y, feet.z);
    enemy.prevFeet.copy(enemy.currFeet);
    this.deps.particles.blood(enemy.center(), { x: 0, y: 1, z: 0 }, enemy.def.bloodColor, 24);
    this.deps.bus.emit('enemyKilled', { kind: enemy.def.kind, position: feet });
  }
}

function readPatrol(value: unknown): [number, number][] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (p): p is [number, number] =>
      Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number'),
  );
}

function normalize(to: Vec3, from: Vec3): Vec3 {
  const x = to.x - from.x;
  const y = to.y - from.y;
  const z = to.z - from.z;
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}

/** Dirección de `from` a `to` desviada al azar dentro de un cono de `spread` radianes. */
function spreadDirection(from: Vec3, to: Vec3, spread: number, rng: Rng): Vec3 {
  const dir = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z).normalize();
  const helper = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(dir, helper).normalize();
  const up = new THREE.Vector3().crossVectors(right, dir);
  const radius = spread * Math.sqrt(rng.next());
  const angle = rng.next() * Math.PI * 2;
  dir.addScaledVector(right, Math.tan(radius * Math.cos(angle)));
  dir.addScaledVector(up, Math.tan(radius * Math.sin(angle)));
  dir.normalize();
  return { x: dir.x, y: dir.y, z: dir.z };
}
