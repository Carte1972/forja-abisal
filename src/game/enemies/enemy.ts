import * as THREE from 'three';
import type { Rng } from '../../engine/core/rng';
import { CharacterBody, ENEMY_CHARACTER } from '../../engine/physics/character_controller';
import type { PhysicsWorld, Vec3 } from '../../engine/physics/physics_world';
import type { Damageable, DamageInfo } from '../rules/damage';
import { createAiMemory, type AiMemory } from './ai_state_machine';
import type { EnemyDef } from './enemy_defs';
import { buildRig, type EnemyRig } from './enemy_models';

/** Algo a lo que un enemigo puede apuntar: el jugador u otro enemigo (peleas entre ellos). */
export interface Combatant extends Damageable {
  readonly colliderHandle: number;
}

export interface EnemySpawn {
  position: Vec3;
  yaw: number;
  patrol: Vec3[];
}

/**
 * Estado de un enemigo: cuerpo físico, modelo, salud, memoria de la IA y navegación.
 * El comportamiento lo decide EnemySystem.
 */
export class Enemy implements Combatant {
  readonly rig: EnemyRig;
  body: CharacterBody | null;
  health: number;
  yaw: number;
  readonly memory: AiMemory;
  target: Combatant;
  /** Objetivo por defecto (el jugador) al que vuelve cuando muere su rival. */
  readonly defaultTarget: Combatant;
  velocity = { x: 0, y: 0, z: 0 };
  knock = { x: 0, z: 0 };
  path: Vec3[] = [];
  repathTimer = 0;
  sightTimer = 0;
  canSeeTarget = false;
  patrolIndex = 0;
  stuckTime = 0;
  walkPhase = 0;
  flash = 0;
  poseTime = 0;
  deathDrop = 0;
  /** Eventos de este paso, que consume la IA. */
  pendingNoise: Vec3 | null = null;
  pendingDamageFrom: Vec3 | null = null;
  pendingPain = false;
  /** Posición de los pies en los dos últimos pasos, para interpolar el render. */
  readonly prevFeet = new THREE.Vector3();
  readonly currFeet = new THREE.Vector3();
  private readonly colliderHandleValue: number;

  constructor(
    readonly def: EnemyDef,
    readonly spawn: EnemySpawn,
    physics: PhysicsWorld,
    player: Combatant,
    private readonly rng: Rng,
  ) {
    this.health = def.health;
    this.yaw = spawn.yaw;
    this.memory = createAiMemory(spawn.patrol.length > 1 ? 'patrol' : 'idle');
    this.target = player;
    this.defaultTarget = player;
    this.rig = buildRig(def.kind);
    this.body = new CharacterBody(
      physics,
      spawn.position,
      { radius: def.radius, standHeight: def.height, crouchHeight: def.height },
      { ...ENEMY_CHARACTER, flying: def.flying },
    );
    this.colliderHandleValue = this.body.collider.handle;
    this.currFeet.set(spawn.position.x, spawn.position.y, spawn.position.z);
    this.prevFeet.copy(this.currFeet);
  }

  get alive(): boolean {
    return this.health > 0;
  }

  get bloodColor(): number {
    return this.def.bloodColor;
  }

  get colliderHandle(): number {
    return this.colliderHandleValue;
  }

  get feet(): Vec3 {
    return this.body
      ? { ...this.body.feetPosition }
      : { x: this.currFeet.x, y: this.currFeet.y, z: this.currFeet.z };
  }

  center(): Vec3 {
    const feet = this.feet;
    return { x: feet.x, y: feet.y + this.def.height * 0.55, z: feet.z };
  }

  /** Posición de los ojos (desde donde mira y dispara). */
  eye(): Vec3 {
    const feet = this.feet;
    return { x: feet.x, y: feet.y + this.def.height * (this.def.flying ? 0.5 : 0.85), z: feet.z };
  }

  applyDamage(info: DamageInfo): void {
    if (!this.alive) return;
    this.health -= info.amount;
    this.flash = 1;
    this.knock.x += info.direction.x * info.knockback;
    this.knock.z += info.direction.z * info.knockback;
    const attacker = info.attacker;
    this.pendingDamageFrom = attacker && isCombatant(attacker) ? attacker.center() : info.point;
    this.pendingPain = this.rng.next() < this.def.painChance;
    // Si otro enemigo le hace daño, se pelea con él.
    if (attacker instanceof Enemy && attacker !== this && attacker.alive) {
      this.target = attacker;
    } else if (attacker && attacker === this.defaultTarget) {
      this.target = this.defaultTarget;
    }
  }
}

function isCombatant(value: unknown): value is Combatant {
  return (
    typeof value === 'object' && value !== null && 'center' in value && 'colliderHandle' in value
  );
}
