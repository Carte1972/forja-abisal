import type RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { clamp } from '../core/math_utils';
import type { PhysicsWorld } from '../physics/physics_world';
import type { Bounds, Lamp } from '../render/light_system';
import type { LampProperties } from './level_parser';
import type { MaterialLibrary } from '../textures/texture_library';
import { loadGltfModel } from './gltf_loader';
import { findSectorAt, surfaceHeightAt } from './level_queries';
import type { LevelData, ThingData } from './level_types';
import { buildLevelGeometry, type GeometryBatch } from './sector_geometry';

export interface LevelSpawn {
  position: { x: number; y: number; z: number };
  yaw: number;
}

/** Puerta o ascensor: un grupo de mallas y un cuerpo cinemático que se desplazan en vertical. */
export class Mover {
  private progressValue = 0;

  constructor(
    readonly kind: 'door' | 'lift',
    readonly sectorIndex: number,
    /** Recorrido total en metros (positivo sube, negativo baja). */
    readonly travel: number,
    readonly object: THREE.Object3D,
    readonly body: RAPIER.RigidBody,
  ) {}

  get progress(): number {
    return this.progressValue;
  }

  /** 0 = posición inicial (puerta cerrada, ascensor arriba); 1 = recorrido completo. */
  setProgress(progress: number): void {
    this.progressValue = clamp(progress, 0, 1);
    const offset = this.travel * this.progressValue;
    this.object.position.y = offset;
    this.body.setNextKinematicTranslation({ x: 0, y: offset, z: 0 });
  }
}

export interface LoadedLevel {
  data: LevelData;
  root: THREE.Group;
  movers: Mover[];
  spawn: LevelSpawn;
  lamps: Lamp[];
  bounds: Bounds;
  /** Handle del collider de la geometría estática (para distinguirla de puertas y enemigos). */
  staticColliderHandle: number;
  /** Estadísticas de la geometría generada (para el panel F3). */
  stats: { meshes: number; triangles: number };
  dispose(): void;
}

function toBufferGeometry(batch: GeometryBatch): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(batch.normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(batch.uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, 3));
  geometry.setIndex(batch.indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function batchesToGroup(
  batches: Map<string, GeometryBatch>,
  materials: MaterialLibrary,
): THREE.Group {
  const group = new THREE.Group();
  // Una malla por textura: toda la geometría con el mismo material va en un único draw call.
  for (const [texture, batch] of batches) {
    if (batch.indices.length === 0) continue;
    const mesh = new THREE.Mesh(toBufferGeometry(batch), materials.get(texture));
    mesh.name = texture;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  return group;
}

const OUTDOOR_LAMP_HEIGHT = 3;

/**
 * Altura por defecto de una lámpara: colgada del techo o, bajo el cielo, sobre un poste de
 * 3 m. Devuelve también la altura del poste (0 si no lleva).
 */
function lampPlacement(level: LevelData, thing: ThingData): { y: number; post: number } {
  const [x, z] = thing.position;
  const sector = findSectorAt(level, x, z);
  if (thing.y !== undefined) return { y: thing.y, post: 0 };
  if (!sector) return { y: OUTDOOR_LAMP_HEIGHT, post: 0 };
  if (sector.sky) {
    return {
      y: surfaceHeightAt(sector.floor, x, z) + OUTDOOR_LAMP_HEIGHT,
      post: OUTDOOR_LAMP_HEIGHT,
    };
  }
  return { y: surfaceHeightAt(sector.ceiling, x, z) - 0.06, post: 0 };
}

function extractLamps(level: LevelData): Lamp[] {
  return level.things
    .filter((thing) => thing.type === 'lamp')
    .map((thing, i) => {
      const props = thing.properties as unknown as LampProperties;
      const { y, post } = lampPlacement(level, thing);
      return {
        position: { x: thing.position[0], y, z: thing.position[1] },
        post,
        color: props.color,
        intensity: props.intensity,
        radius: props.radius,
        flicker: props.flicker,
        shadows: props.shadows,
        seed: i * 7.31 + 1,
      };
    });
}

function collisionBounds(positions: number[]): Bounds {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (let i = 0; i < positions.length; i += 3) {
    min.x = Math.min(min.x, positions[i]!);
    min.y = Math.min(min.y, positions[i + 1]!);
    min.z = Math.min(min.z, positions[i + 2]!);
    max.x = Math.max(max.x, positions[i]!);
    max.y = Math.max(max.y, positions[i + 1]!);
    max.z = Math.max(max.z, positions[i + 2]!);
  }
  return { min, max };
}

function thingHeight(level: LevelData, thing: ThingData): number {
  if (thing.y !== undefined) return thing.y;
  const [x, z] = thing.position;
  const sector = findSectorAt(level, x, z);
  return sector ? surfaceHeightAt(sector.floor, x, z) : 0;
}

/** Crea las mallas, los colliders y los elementos móviles de un nivel ya validado. */
export function buildLevel(
  data: LevelData,
  scene: THREE.Scene,
  physics: PhysicsWorld,
  materials: MaterialLibrary,
): LoadedLevel {
  const geometry = buildLevelGeometry(data);
  const root = new THREE.Group();
  root.name = `level:${data.name}`;
  root.add(batchesToGroup(geometry.batches, materials));

  const bodies: RAPIER.RigidBody[] = [];
  const staticCollider = physics.addStaticTrimesh(
    new Float32Array(geometry.collision.positions),
    new Uint32Array(geometry.collision.indices),
  );

  const movers = geometry.movers.map((moverGeometry) => {
    const group = batchesToGroup(moverGeometry.batches, materials);
    // Las mallas de los móviles sí se desplazan: su matriz se actualiza en cada frame.
    group.traverse((object) => (object.matrixAutoUpdate = true));
    group.name = `${moverGeometry.kind}:${moverGeometry.sectorIndex}`;
    root.add(group);
    const body = physics.addKinematicConvexHull(new Float32Array(moverGeometry.hullPoints));
    bodies.push(body);
    return new Mover(
      moverGeometry.kind,
      moverGeometry.sectorIndex,
      moverGeometry.travel,
      group,
      body,
    );
  });

  for (const object of root.children) object.updateMatrixWorld(true);
  scene.add(root);

  const start = data.things.find((thing) => thing.type === 'player_start');
  if (!start) throw new Error('El nivel no tiene player_start');
  const spawn: LevelSpawn = {
    position: { x: start.position[0], y: thingHeight(data, start), z: start.position[1] },
    yaw: start.angle,
  };

  for (const thing of data.things) {
    if (thing.type !== 'model') continue;
    const url = thing.properties.url;
    if (typeof url !== 'string') continue;
    const modelScale = typeof thing.properties.scale === 'number' ? thing.properties.scale : 1;
    loadGltfModel(url)
      .then((model) => {
        model.position.set(thing.position[0], thingHeight(data, thing), thing.position[1]);
        model.rotation.y = thing.angle;
        model.scale.setScalar(modelScale);
        root.add(model);
      })
      .catch((error: unknown) => console.warn(`No se pudo cargar el modelo ${url}`, error));
  }

  let triangles = 0;
  let meshes = 0;
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      meshes++;
      triangles += (object.geometry.index?.count ?? 0) / 3;
    }
  });

  return {
    data,
    root,
    movers,
    spawn,
    lamps: extractLamps(data),
    staticColliderHandle: staticCollider.handle,
    bounds: collisionBounds(geometry.collision.positions),
    stats: { meshes, triangles },
    dispose() {
      scene.remove(root);
      root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      for (const body of bodies) physics.removeBody(body);
      const staticBody = staticCollider.parent();
      if (staticBody) physics.removeBody(staticBody);
    },
  };
}
