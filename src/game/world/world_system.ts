import * as THREE from 'three';
import type { EventBus } from '../../engine/core/event_bus';
import type { Mover, LoadedLevel } from '../../engine/level/level_builder';
import { thingHeight } from '../../engine/level/level_builder';
import { findSectorAt, sectorContains, surfaceHeightAt } from '../../engine/level/level_queries';
import type { KeyColor, SectorData } from '../../engine/level/level_types';
import { GROUP, interactionGroups } from '../../engine/physics/collision_groups';
import type { PhysicsWorld, Vec3 } from '../../engine/physics/physics_world';
import type { GameEvents } from '../game_events';
import type { Player } from '../player/player';
import type { PlayerCombatant } from '../player/player_combatant';
import {
  activateMover,
  createMoverState,
  stepMover,
  type MoverEvent,
  type MoverParams,
  type MoverState,
} from './mover_logic';
import { applyPickup, isPickupId, PICKUPS, type Inventory, type PickupId } from './pickup_rules';
import { buildExitSwitch, buildPickupModel } from './world_models';

const USE_RANGE = 2;
const USE_GROUPS = interactionGroups(GROUP.HITSCAN, GROUP.STATIC | GROUP.MOVER);
const PICKUP_RADIUS = 1;
const DAMAGE_TICK = 0.5;
const KEY_NAMES: Record<KeyColor, string> = { red: 'roja', blue: 'azul', yellow: 'amarilla' };

interface WorldMover {
  mover: Mover;
  sector: SectorData;
  state: MoverState;
  params: MoverParams;
  key: KeyColor | undefined;
  /** Las paredes secretas y las puertas con llave no las abren los enemigos. */
  enemyUsable: boolean;
}

interface PickupEntity {
  id: PickupId;
  root: THREE.Group;
  spinner: THREE.Group;
  position: Vec3;
  phase: number;
  taken: boolean;
}

interface ExitSwitch {
  position: Vec3;
  setOn(on: boolean): void;
}

export interface WorldSystemDeps {
  physics: PhysicsWorld;
  scene: THREE.Scene;
  level: LoadedLevel;
  bus: EventBus<GameEvents>;
  player: Player;
  playerCombatant: PlayerCombatant;
  inventory: Inventory;
  /** Posiciones de los pies de los enemigos vivos (para no cerrar puertas encima de ellos). */
  enemyFeet: () => Vec3[];
}

/**
 * Mecánicas del nivel: puertas y ascensores (usar, esperar, volver, reabrir si hay alguien),
 * llaves, paredes secretas, zonas secretas, suelos que hacen daño, objetos y salida.
 */
export class WorldSystem {
  readonly group = new THREE.Group();
  private readonly movers: WorldMover[] = [];
  private readonly pickups: PickupEntity[] = [];
  private readonly exits: ExitSwitch[] = [];
  private readonly secretsFound = new Set<number>();
  private damageTimer = 0;
  private time = 0;
  completed = false;

  constructor(private readonly deps: WorldSystemDeps) {
    this.group.name = 'world';
    deps.scene.add(this.group);
    const { data } = deps.level;
    for (const mover of deps.level.movers) {
      const sector = data.sectors[mover.sectorIndex]!;
      const special = sector.special!;
      if (special.type !== 'door' && special.type !== 'lift') continue;
      this.movers.push({
        mover,
        sector,
        state: createMoverState(),
        params: {
          travel: Math.abs(mover.travel),
          speed: special.speed,
          waitTime: special.waitTime,
        },
        key: special.type === 'door' ? special.key : undefined,
        enemyUsable: special.type === 'door' && !special.key && !special.hidden,
      });
    }
    for (const thing of data.things) {
      const [x, z] = thing.position;
      const position = { x, y: thingHeight(data, thing), z };
      if (thing.type === 'pickup') {
        const item = thing.properties.item;
        if (!isPickupId(item)) {
          console.warn(`Objeto desconocido "${String(item)}" en (${x}, ${z})`);
          continue;
        }
        const { root, spinner } = buildPickupModel(item);
        root.position.set(position.x, position.y, position.z);
        this.group.add(root);
        this.pickups.push({
          id: item,
          root,
          spinner,
          position,
          phase: (x * 7 + z * 3) % 6,
          taken: false,
        });
      } else if (thing.type === 'exit') {
        const exit = buildExitSwitch();
        exit.root.position.set(position.x, position.y, position.z);
        exit.root.rotation.y = thing.angle;
        this.group.add(exit.root);
        this.exits.push({ position, setOn: exit.setOn });
      }
    }
  }

  /** Llaves que quedan por recoger y salidas (para el automapa). */
  markers(): { position: [number, number]; kind: 'key' | 'exit'; key?: KeyColor }[] {
    const keys = this.pickups
      .filter((p) => !p.taken && p.id.startsWith('key_'))
      .map((p) => ({
        position: [p.position.x, p.position.z] as [number, number],
        kind: 'key' as const,
        key: p.id.slice(4) as KeyColor,
      }));
    const exits = this.exits.map((e) => ({
      position: [e.position.x, e.position.z] as [number, number],
      kind: 'exit' as const,
    }));
    return [...keys, ...exits];
  }

  get totalItems(): number {
    return this.pickups.length;
  }

  get totalSecrets(): number {
    return this.deps.level.data.sectors.filter((sector) => sector.secret).length;
  }

  /**
   * Paso de simulación: mueve puertas y ascensores (y lleva al jugador si está encima de un
   * ascensor), recoge objetos, detecta secretos y aplica el daño del suelo. Debe llamarse antes
   * de mover al jugador.
   */
  fixedUpdate(dt: number): void {
    this.time += dt;
    const { player, physics } = this.deps;
    const feet = player.body.feetPosition;
    const liftUnderPlayer = this.liftUnder(feet);
    const enemies = this.deps.enemyFeet();
    let moved = false;
    let carry = 0;

    for (const entry of this.movers) {
      const before = entry.mover.offset;
      const blocked =
        entry.mover.kind === 'door' &&
        (this.inside(entry.sector, feet) || enemies.some((p) => this.inside(entry.sector, p)));
      const events = stepMover(entry.state, entry.params, blocked, dt);
      if (events.length > 0) this.moverSounds(entry, events);
      if (entry.state.progress !== entry.mover.progress) {
        entry.mover.setProgress(entry.state.progress);
        moved = true;
        if (entry === liftUnderPlayer) carry = entry.mover.offset - before;
      }
    }
    if (moved) physics.world.propagateModifiedBodyPositionsToColliders();
    // Quien está sobre un ascensor se mueve con él (el controlador de personaje no lo hace solo).
    if (carry !== 0 && !player.dead) {
      player.body.teleport({ x: feet.x, y: feet.y + carry, z: feet.z });
    }

    if (player.dead) return;
    this.collectPickups();
    this.checkSecrets(feet);
    this.applyFloorDamage(feet, dt);
  }

  /** Animación de los objetos (flotan y giran), en cada frame. */
  render(dt: number): void {
    for (const pickup of this.pickups) {
      if (pickup.taken) continue;
      pickup.phase += dt;
      pickup.spinner.rotation.y = pickup.phase * 1.6;
      pickup.spinner.position.y = 0.55 + Math.sin(pickup.phase * 2.2) * 0.08;
    }
  }

  /** El jugador pulsa "usar" mirando en la dirección `forward` desde `eye`. */
  use(eye: Vec3, forward: Vec3): void {
    const { player, physics, bus } = this.deps;
    // Interruptores de salida delante y a mano.
    for (const exit of this.exits) {
      const center = { x: exit.position.x, y: exit.position.y + 0.8, z: exit.position.z };
      const dx = center.x - eye.x;
      const dy = center.y - eye.y;
      const dz = center.z - eye.z;
      const distance = Math.hypot(dx, dy, dz);
      if (
        distance < USE_RANGE + 0.3 &&
        (dx * forward.x + dy * forward.y + dz * forward.z) / distance > 0.6
      ) {
        exit.setOn(true);
        this.completed = true;
        bus.emit('sound', { id: 'exit' });
        bus.emit('levelComplete', {});
        return;
      }
    }
    // Puertas y ascensores a los que se apunta.
    const hit = physics.castRay(eye, forward, USE_RANGE, USE_GROUPS, player.body.collider);
    const target = hit
      ? this.movers.find((m) => m.mover.colliderHandle === hit.collider.handle)
      : undefined;
    // O el ascensor sobre el que se está.
    const entry = target ?? this.liftUnder(player.body.feetPosition);
    if (!entry) return;
    if (entry.key && !this.deps.inventory.keys.has(entry.key)) {
      bus.emit('message', { text: `Necesitas la llave ${KEY_NAMES[entry.key]}`, color: 0xff6040 });
      bus.emit('sound', { id: 'denied' });
      return;
    }
    activateMover(entry.state);
  }

  /** Un enemigo quiere pasar por `point`: si hay una puerta normal ahí, la abre. */
  openDoorForEnemy(point: Vec3): void {
    for (const entry of this.movers) {
      if (entry.enemyUsable && entry.state.phase !== 'going' && this.inside(entry.sector, point)) {
        activateMover(entry.state);
      }
    }
  }

  dispose(): void {
    this.deps.scene.remove(this.group);
  }

  /** Motor de puertas y ascensores al arrancar, volver y reabrirse. */
  private moverSounds(entry: WorldMover, events: MoverEvent[]): void {
    const ring = entry.sector.outer.map((i) => this.deps.level.data.vertices[i]!);
    const x = ring.reduce((sum, p) => sum + p[0], 0) / ring.length;
    const z = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
    const position = { x, y: entry.sector.floor.height + entry.mover.offset + 1, z };
    for (const event of events) {
      if (entry.mover.kind === 'lift') {
        if (event === 'start' || event === 'return')
          this.deps.bus.emit('sound', { id: 'lift', position });
      } else if (event === 'start' || event === 'reopen') {
        this.deps.bus.emit('sound', { id: 'door_open', position });
      } else if (event === 'return') {
        this.deps.bus.emit('sound', { id: 'door_close', position });
      }
    }
  }

  private inside(sector: SectorData, point: Vec3): boolean {
    return sectorContains(this.deps.level.data, sector, point.x, point.z);
  }

  private liftUnder(feet: Vec3): WorldMover | undefined {
    return this.movers.find((entry) => {
      if (entry.mover.kind !== 'lift' || !this.inside(entry.sector, feet)) return false;
      const top = entry.sector.floor.height + entry.mover.offset;
      return Math.abs(feet.y - top) < 0.35;
    });
  }

  private collectPickups(): void {
    const { player, bus, inventory } = this.deps;
    const center = player.center();
    for (const pickup of this.pickups) {
      if (pickup.taken) continue;
      const dx = pickup.position.x - center.x;
      const dz = pickup.position.z - center.z;
      if (Math.hypot(dx, dz) > PICKUP_RADIUS || Math.abs(pickup.position.y + 0.5 - center.y) > 1.3)
        continue;
      const def = PICKUPS[pickup.id];
      const newWeapon =
        def.effect.kind === 'weapon' && !inventory.hasWeapon(def.effect.weapon)
          ? def.effect.weapon
          : undefined;
      if (!applyPickup(inventory, pickup.id)) continue;
      pickup.taken = true;
      this.group.remove(pickup.root);
      bus.emit('pickup', { id: pickup.id, name: def.name, color: def.flash, weapon: newWeapon });
      bus.emit('sound', {
        id:
          def.effect.kind === 'key'
            ? 'pickup_key'
            : def.effect.kind === 'weapon'
              ? 'pickup_weapon'
              : 'pickup',
      });
    }
  }

  private checkSecrets(feet: Vec3): void {
    const sector = findSectorAt(this.deps.level.data, feet.x, feet.z);
    if (!sector?.secret || this.secretsFound.has(sector.index)) return;
    this.secretsFound.add(sector.index);
    this.deps.bus.emit('message', { text: '¡Has encontrado un secreto!', color: 0xffd070 });
    this.deps.bus.emit('secretFound', {});
    this.deps.bus.emit('sound', { id: 'secret' });
  }

  /** Lava y ácido hacen daño a intervalos mientras se pisan. */
  private applyFloorDamage(feet: Vec3, dt: number): void {
    const { data } = this.deps.level;
    const sector = findSectorAt(data, feet.x, feet.z);
    const special = sector?.special;
    if (!sector || special?.type !== 'damage') {
      this.damageTimer = 0;
      return;
    }
    const onFloor = feet.y - surfaceHeightAt(sector.floor, feet.x, feet.z) < 0.15;
    if (!onFloor) return;
    this.damageTimer -= dt;
    if (this.damageTimer > 0) return;
    this.damageTimer = DAMAGE_TICK;
    const center = this.deps.player.center();
    this.deps.playerCombatant.applyDamage({
      amount: special.damagePerSecond * DAMAGE_TICK,
      point: center,
      direction: { x: 0, y: 1, z: 0 },
      knockback: 0,
      source: 'environment',
    });
  }
}
