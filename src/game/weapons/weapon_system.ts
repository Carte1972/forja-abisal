import * as THREE from 'three';
import type { EventBus } from '../../engine/core/event_bus';
import type { Rng } from '../../engine/core/rng';
import type { InputSystem } from '../../engine/input/input_system';
import type { LoadedLevel } from '../../engine/level/level_builder';
import { findSectorAt } from '../../engine/level/level_queries';
import { GROUP, interactionGroups, SOLID_WORLD } from '../../engine/physics/collision_groups';
import type { PhysicsWorld, RayHit, Vec3 } from '../../engine/physics/physics_world';
import type { DecalSystem } from '../../engine/render/decal_system';
import type { LightSystem } from '../../engine/render/light_system';
import type { ParticleSystem } from '../../engine/render/particle_system';
import type { GameEvents } from '../game_events';
import type { Player } from '../player/player';
import { explosionFalloff, type DamageRegistry } from '../rules/damage';
import { ProjectileSystem, type ExplosionRequest } from './projectiles';
import { ViewmodelAnimator } from './viewmodel_animator';
import { buildViewmodels, disposeViewmodels, type Viewmodel } from './viewmodels';
import {
  WEAPON_ORDER,
  WEAPONS,
  type FireMode,
  type FireModeDef,
  type WeaponId,
} from './weapon_defs';
import {
  createWeaponState,
  updateWeapons,
  type Loadout,
  type Shot,
  type WeaponEvent,
  type WeaponState,
} from './weapon_logic';

/** Los disparos tocan el nivel, los móviles y los enemigos. */
const RAY_GROUPS = interactionGroups(GROUP.HITSCAN, SOLID_WORLD);
/** Solo la geometría del nivel, para comprobar si una explosión llega a un objetivo. */
const WORLD_ONLY = interactionGroups(GROUP.HITSCAN, GROUP.STATIC | GROUP.MOVER);
const EXPLOSION_PUSH = 15;
const MUZZLE_FLASH: Record<WeaponId, { intensity: number; radius: number }> = {
  hammer: { intensity: 0, radius: 0 },
  pistol: { intensity: 1.6, radius: 7 },
  shotgun: { intensity: 3, radius: 9 },
  riveter: { intensity: 1.8, radius: 7 },
  launcher: { intensity: 2.5, radius: 8 },
};

export interface WeaponSystemDeps {
  physics: PhysicsWorld;
  camera: THREE.PerspectiveCamera;
  viewmodelScene: THREE.Scene;
  scene: THREE.Scene;
  lights: LightSystem;
  particles: ParticleSystem;
  decals: DecalSystem;
  damage: DamageRegistry;
  bus: EventBus<GameEvents>;
  player: Player;
  level: LoadedLevel;
  rng: Rng;
  /** Al disparar (para abrir el punto de mira). */
  onShot?: (def: FireModeDef) => void;
}

/**
 * Une la lógica de las armas con el mundo: convierte sus eventos en rayos, impactos,
 * proyectiles, explosiones, fogonazos, retroceso y ruido, y anima el arma en pantalla.
 */
export class WeaponSystem {
  readonly state: WeaponState;
  readonly projectiles: ProjectileSystem;
  private readonly models: Record<WeaponId, Viewmodel>;
  private readonly animator: ViewmodelAnimator;
  private readonly viewmodelLights = new THREE.Group();
  private readonly ambient = new THREE.HemisphereLight(0xfff0e0, 0x302820, 1);
  private readonly muzzleLight = new THREE.PointLight(0xffb060, 0, 1.5, 2);
  private muzzleLightTimer = 0;
  private lightSampleTimer = 0;
  private sectorLight = 0.8;
  // Vectores reutilizables para no crear objetos en cada disparo.
  private readonly eye = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly muzzleWorld = new THREE.Vector3();

  constructor(
    private readonly deps: WeaponSystemDeps,
    loadout: Loadout,
  ) {
    this.state = createWeaponState(loadout);
    this.models = buildViewmodels();
    this.animator = new ViewmodelAnimator(
      this.models,
      deps.viewmodelScene,
      this.state.current,
      deps.rng,
    );
    const key = new THREE.DirectionalLight(0xfff4e8, 2);
    key.position.set(-1, 2, 1);
    this.viewmodelLights.add(this.ambient, key, this.muzzleLight);
    deps.viewmodelScene.add(this.viewmodelLights);
    this.projectiles = new ProjectileSystem(deps.physics, deps.particles, (request) =>
      this.explode(request),
    );
    deps.scene.add(this.projectiles.group);
  }

  get currentDef(): FireModeDef {
    return WEAPONS[this.state.current].primary;
  }

  fixedUpdate(dt: number, input: InputSystem, active: boolean): void {
    let select: WeaponId | null = null;
    WEAPON_ORDER.forEach((id, i) => {
      if (input.consumePressed(`weapon${i + 1}` as 'weapon1')) select = id;
    });
    const events = updateWeapons(
      this.state,
      {
        fire: active && input.isDown('fire'),
        alt: active && input.isDown('altFire'),
        reload: input.consumePressed('reload'),
        select,
        cycle: Math.sign(input.consumeWheel()),
      },
      dt,
      this.deps.rng,
    );
    for (const event of events) this.handle(event);
    this.projectiles.update(dt);
  }

  /** Animación del arma y luces de su capa, en cada frame. */
  frameUpdate(dt: number, lookDX: number, lookDY: number, bobEnabled: boolean): void {
    const { player } = this.deps;
    const v = player.movement.velocity;
    this.animator.update(dt, {
      lookDX,
      lookDY,
      horizontalSpeed: Math.hypot(v.x, v.z),
      grounded: player.movement.grounded,
      bobEnabled,
    });

    // El arma se ilumina según la luz del sector en el que está el jugador.
    this.lightSampleTimer -= dt;
    if (this.lightSampleTimer <= 0) {
      this.lightSampleTimer = 0.2;
      const feet = player.body.feetPosition;
      this.sectorLight = findSectorAt(this.deps.level.data, feet.x, feet.z)?.light ?? 0.8;
    }
    this.ambient.intensity = 0.7 + this.sectorLight * 1.6;
    this.muzzleLightTimer -= dt;
    this.muzzleLight.intensity = this.muzzleLightTimer > 0 ? 4 : 0;
    this.muzzleLight.position.copy(this.animator.muzzle.getWorldPosition(this.muzzleWorld));
  }

  setVisible(visible: boolean): void {
    this.animator.setVisible(visible);
  }

  handleCollision(handle1: number, handle2: number): void {
    this.projectiles.handleCollision(handle1, handle2);
  }

  dispose(): void {
    this.projectiles.dispose();
    this.deps.scene.remove(this.projectiles.group);
    for (const model of Object.values(this.models)) this.deps.viewmodelScene.remove(model.root);
    this.deps.viewmodelScene.remove(this.viewmodelLights);
    disposeViewmodels(this.models);
  }

  private handle(event: WeaponEvent): void {
    switch (event.type) {
      case 'fire':
        this.animator.onFire(event.weapon, event.mode, event.def);
        this.fire(event.weapon, event.mode, event.def, event.shots);
        break;
      case 'reloadStart':
        this.animator.onReloadStart(event.duration);
        break;
      case 'lower':
        this.animator.onLower(event.duration);
        break;
      case 'raise':
        this.animator.onRaise(event.weapon, event.duration);
        break;
      case 'dryFire':
      case 'reloadEnd':
        // Los sonidos llegan en la fase 8.
        break;
    }
  }

  private fire(weapon: WeaponId, _mode: FireMode, def: FireModeDef, shots: Shot[]): void {
    const { player, bus, rng } = this.deps;
    this.updateAimBasis();
    player.addRecoil(def.recoil, rng.range(-0.3, 0.3) * def.recoil);
    this.deps.onShot?.(def);
    bus.emit('noise', { position: this.vec(this.eye), radius: def.noise, source: 'player' });

    if (def.kind !== 'melee') {
      const muzzle = this.muzzleWorldPosition();
      const flash = MUZZLE_FLASH[weapon];
      this.deps.lights.flash(muzzle, 0xffb060, flash.intensity, flash.radius, 0.07);
      this.muzzleLightTimer = 0.05;
      this.deps.particles.smoke(muzzle, 1, 0.06);
    }

    switch (def.kind) {
      case 'hitscan':
        for (const shot of shots) this.hitscan(def, shot, shots.length > 1);
        break;
      case 'melee':
        this.melee(def);
        break;
      case 'projectile':
        this.launch(def);
        break;
    }
  }

  private updateAimBasis(): void {
    const { camera } = this.deps;
    camera.updateMatrixWorld();
    camera.getWorldPosition(this.eye);
    this.forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    this.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
  }

  private shotDirection(shot: Shot): THREE.Vector3 {
    return this.forward
      .clone()
      .addScaledVector(this.right, Math.tan(shot.yaw))
      .addScaledVector(this.up, Math.tan(shot.pitch))
      .normalize();
  }

  private castFromEye(dir: THREE.Vector3, range: number): RayHit | null {
    return this.deps.physics.castRay(
      this.vec(this.eye),
      this.vec(dir),
      range,
      RAY_GROUPS,
      this.deps.player.body.collider,
    );
  }

  private hitscan(def: FireModeDef, shot: Shot, pellet: boolean): void {
    const dir = this.shotDirection(shot);
    const hit = this.castFromEye(dir, def.range);
    if (!hit) return;
    this.impact(hit, dir, def, pellet ? 3 : 8);
  }

  /** Tres rayos en abanico para que el golpe cuerpo a cuerpo no exija una puntería exacta. */
  private melee(def: FireModeDef): void {
    for (const yaw of [0, -0.14, 0.14]) {
      const dir = this.shotDirection({ yaw, pitch: 0 });
      const hit = this.castFromEye(dir, def.range);
      if (!hit) continue;
      const target = this.deps.damage.lookup(hit.collider.handle);
      if (target) {
        this.impact(hit, dir, def, 0);
      } else {
        this.deps.particles.dust(hit.point, hit.normal, def.damage > 50 ? 14 : 7);
        this.deps.particles.sparks(hit.point, hit.normal, def.damage > 50 ? 6 : 2);
        this.deps.player.addShake(def.damage > 50 ? 0.35 : 0.15);
      }
      return;
    }
  }

  private impact(hit: RayHit, dir: THREE.Vector3, def: FireModeDef, sparks: number): void {
    const { damage, particles, decals, level, rng } = this.deps;
    const target = damage.lookup(hit.collider.handle);
    if (target) {
      target.applyDamage({
        amount: def.damage,
        point: hit.point,
        direction: this.vec(dir),
        knockback: def.knockback,
        source: 'player',
        attacker: this.deps.player,
      });
      particles.blood(hit.point, this.vec(dir), target.bloodColor, def.kind === 'melee' ? 20 : 10);
      return;
    }
    particles.sparks(hit.point, hit.normal, sparks);
    // Solo se marca la geometría estática: las puertas se mueven y dejarían marcas flotando.
    if (hit.collider.handle === level.staticColliderHandle) {
      decals.bulletHole(hit.point, hit.normal, rng.next());
    }
  }

  private launch(def: FireModeDef): void {
    const spawn = this.eye
      .clone()
      .addScaledVector(this.forward, 0.55)
      .addScaledVector(this.right, 0.14)
      .addScaledVector(this.up, -0.12);
    // Apunta al punto que marca la mira, no en paralelo a ella.
    const aimHit = this.castFromEye(this.forward, 200);
    const aimPoint = aimHit
      ? new THREE.Vector3(aimHit.point.x, aimHit.point.y, aimHit.point.z)
      : this.eye.clone().addScaledVector(this.forward, 200);
    const dir = aimPoint.clone().sub(spawn).normalize();
    // Si el punto de salida queda al otro lado de una pared (pegado a ella), sale desde la pared.
    const toSpawn = spawn.clone().sub(this.eye);
    const blocked = this.deps.physics.castRay(
      this.vec(this.eye),
      this.vec(toSpawn.clone().normalize()),
      toSpawn.length(),
      RAY_GROUPS,
      this.deps.player.body.collider,
    );
    if (blocked) {
      spawn
        .set(blocked.point.x, blocked.point.y, blocked.point.z)
        .addScaledVector(toSpawn.normalize(), -0.05);
    }
    this.projectiles.spawn(def.projectile ?? 'charge', this.vec(spawn), this.vec(dir), def.damage);
  }

  private explode(request: ExplosionRequest): void {
    const { particles, lights, decals, damage, physics, player, bus, rng, level } = this.deps;
    const { position, radius } = request;
    particles.explosion(position, radius * 0.45);
    lights.flash(position, 0xff8030, 7, radius * 3, 0.35);
    bus.emit('noise', { position, radius: 60, source: 'player' });
    bus.emit('explosion', { position, radius });

    // Marca de quemadura en la superficie más cercana (en la dirección de vuelo o debajo).
    for (const dir of [request.heading, { x: 0, y: -1, z: 0 }]) {
      const back = {
        x: position.x - dir.x * 0.3,
        y: position.y - dir.y * 0.3,
        z: position.z - dir.z * 0.3,
      };
      const hit = physics.castRay(back, dir, 1.2, WORLD_ONLY);
      if (hit && hit.collider.handle === level.staticColliderHandle) {
        // Se prueba a tamaño completo y a la mitad; si no cabe en la superficie, no se pega.
        for (const size of [radius * 0.5, radius * 0.25]) {
          if (this.surfaceFits(hit.point, hit.normal, size * 1.1 * 0.45)) {
            decals.scorch(hit.point, hit.normal, size, rng.next());
            break;
          }
        }
        break;
      }
    }

    for (const target of damage.within(position, radius)) {
      const center = target.center();
      if (!this.hasLineOfSight(position, center)) continue;
      const distance = Math.hypot(
        center.x - position.x,
        center.y - position.y,
        center.z - position.z,
      );
      const falloff = explosionFalloff(distance, radius);
      const direction = this.normalized(center, position);
      target.applyDamage({
        amount: request.damage * falloff,
        point: center,
        direction,
        knockback: EXPLOSION_PUSH * falloff,
        source: 'player',
        attacker: player,
      });
      particles.blood(center, direction, target.bloodColor, 16);
    }

    // Empuje (y rocket jump) sobre el propio jugador.
    const center = player.center();
    const distance = Math.hypot(
      center.x - position.x,
      center.y - position.y,
      center.z - position.z,
    );
    if (distance < radius && this.hasLineOfSight(position, center)) {
      const falloff = explosionFalloff(distance, radius);
      const dir = this.normalized(center, position);
      player.applyImpulse({
        x: dir.x * EXPLOSION_PUSH * falloff,
        y: (dir.y * 0.6 + 0.4) * EXPLOSION_PUSH * falloff,
        z: dir.z * EXPLOSION_PUSH * falloff,
      });
      // El empuje ya se ha aplicado arriba; aquí solo el daño (el propio disparo hiere menos).
      damage.playerTarget?.applyDamage({
        amount: request.damage * 0.4 * falloff,
        point: center,
        direction: dir,
        knockback: 0,
        source: 'player',
        attacker: player,
      });
    }
    const shake = Math.max(0, 1 - distance / (radius * 4));
    player.addShake(shake * 0.8);
  }

  /**
   * Comprueba que alrededor de `point` hay una superficie plana de al menos `half` metros en
   * cada dirección, para que una marca no sobresalga por el borde de un peldaño o una esquina.
   */
  private surfaceFits(point: Vec3, normal: Vec3, half: number): boolean {
    const n = new THREE.Vector3(normal.x, normal.y, normal.z);
    const helper = Math.abs(n.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const t1 = new THREE.Vector3().crossVectors(n, helper).normalize();
    const t2 = new THREE.Vector3().crossVectors(n, t1);
    const back = { x: -n.x, y: -n.y, z: -n.z };
    for (const [a, b] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as const) {
      const corner = new THREE.Vector3(point.x, point.y, point.z)
        .addScaledVector(t1, a * half)
        .addScaledVector(t2, b * half)
        .addScaledVector(n, 0.1);
      const hit = this.deps.physics.castRay(this.vec(corner), back, 0.2, WORLD_ONLY);
      if (!hit || Math.abs(hit.distance - 0.1) > 0.03) return false;
    }
    return true;
  }

  private hasLineOfSight(from: Vec3, to: Vec3): boolean {
    const dir = this.normalized(to, from);
    const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
    if (distance < 0.01) return true;
    return this.deps.physics.castRay(from, dir, distance - 0.05, WORLD_ONLY) === null;
  }

  /** Posición del cañón en el mundo: la capa del arma comparte orientación con la cámara. */
  private muzzleWorldPosition(): Vec3 {
    this.animator.muzzle.getWorldPosition(this.muzzleWorld);
    this.deps.camera.localToWorld(this.muzzleWorld);
    return this.vec(this.muzzleWorld);
  }

  private normalized(to: Vec3, from: Vec3): Vec3 {
    const x = to.x - from.x;
    const y = to.y - from.y;
    const z = to.z - from.z;
    const length = Math.hypot(x, y, z) || 1;
    return { x: x / length, y: y / length, z: z / length };
  }

  private vec(v: THREE.Vector3): Vec3 {
    return { x: v.x, y: v.y, z: v.z };
  }
}
