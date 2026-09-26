import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp } from '../../engine/core/math_utils';
import type { EnemyKind } from './enemy_defs';

/**
 * Modelos low-poly de los enemigos construidos con primitivas en jerarquías (cadera → torso →
 * cabeza y brazos; piernas colgando de la cadera) y su animación procedural. Diseños originales.
 *
 * Convención: el modelo mira a -Z (como la cámara con yaw 0) y el origen está en los pies.
 */

export interface EnemyRig {
  root: THREE.Group;
  /** Todo el cuerpo: se inclina y se hunde al morir. */
  body: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group | null;
  legR: THREE.Group | null;
  /** Aletas del vigía, que giran. */
  fins: THREE.Group | null;
  /** Punto desde el que dispara (en coordenadas del modelo). */
  muzzle: THREE.Object3D;
  /** Materiales propios de este enemigo, para el destello al recibir daño. */
  flashMaterials: THREE.MeshStandardMaterial[];
  /** Postura de reposo de cada articulación (para volver a ella). */
  kind: EnemyKind;
}

export type RigPose = 'idle' | 'walk' | 'attack' | 'pain' | 'dead';

interface Palette {
  main: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  glow: THREE.MeshStandardMaterial;
}

function palette(main: number, dark: number, accent: number, glow: number, glowIntensity: number) {
  const flat = (color: number, roughness = 0.75, metalness = 0.1) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: 0x101010,
    emissive: new THREE.Color(glow),
    emissiveIntensity: glowIntensity,
    flatShading: true,
  });
  return {
    main: flat(main, 0.6, 0.3),
    dark: flat(dark, 0.8, 0.2),
    accent: flat(accent, 0.7, 0.1),
    glow: glowMaterial,
  } satisfies Palette;
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function ball(radius: number, material: THREE.Material, x = 0, y = 0, z = 0, detail = 1) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, detail), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

/** Grupo articulado en `pivot` (hombro, cadera...). */
function joint(parent: THREE.Object3D, x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

function baseRig(kind: EnemyKind, p: Palette): EnemyRig {
  const root = new THREE.Group();
  const body = joint(root, 0, 0, 0);
  const hips = joint(body, 0, 0, 0);
  const torso = joint(hips, 0, 0, 0);
  const head = joint(torso, 0, 0, 0);
  const armL = joint(torso, 0, 0, 0);
  const armR = joint(torso, 0, 0, 0);
  const muzzle = new THREE.Object3D();
  return {
    root,
    body,
    hips,
    torso,
    head,
    armL,
    armR,
    legL: null,
    legR: null,
    fins: null,
    muzzle,
    flashMaterials: [p.main, p.dark, p.accent],
    kind,
  };
}

function legs(
  rig: EnemyRig,
  p: Palette,
  hipY: number,
  spread: number,
  length: number,
  width: number,
) {
  const make = (side: number) => {
    const leg = joint(rig.hips, side * spread, hipY, 0);
    leg.add(box(width, length * 0.55, width, p.main, 0, -length * 0.27, 0));
    leg.add(box(width * 0.85, length * 0.5, width * 0.85, p.dark, 0, -length * 0.72, 0));
    leg.add(box(width * 1.1, length * 0.08, width * 1.6, p.dark, 0, -length + 0.04, -width * 0.25));
    return leg;
  };
  rig.legL = make(-1);
  rig.legR = make(1);
}

/** Centinela: soldado acorazado, visor rojo, arma en el brazo derecho. */
function sentinel(): EnemyRig {
  const p = palette(0x6b7258, 0x2f3329, 0x8c8f7a, 0xff3020, 3);
  const rig = baseRig('sentinel', p);
  const hipY = 0.92;
  rig.hips.position.y = hipY;
  legs(rig, p, 0, 0.14, hipY, 0.17);
  rig.hips.add(box(0.42, 0.16, 0.26, p.dark, 0, 0, 0));
  rig.torso.position.y = 0.08;
  rig.torso.add(box(0.5, 0.52, 0.3, p.main, 0, 0.3, 0));
  rig.torso.add(box(0.36, 0.3, 0.08, p.accent, 0, 0.34, -0.17));
  rig.torso.add(box(0.12, 0.26, 0.2, p.dark, 0, 0.38, 0.2));
  rig.head.position.set(0, 0.62, 0);
  rig.head.add(box(0.26, 0.26, 0.28, p.main, 0, 0.13, 0));
  rig.head.add(box(0.22, 0.06, 0.04, p.glow, 0, 0.15, -0.15));
  for (const [arm, side] of [
    [rig.armL, -1],
    [rig.armR, 1],
  ] as const) {
    arm.position.set(side * 0.33, 0.5, 0);
    arm.add(box(0.2, 0.18, 0.2, p.dark, 0, 0, 0));
    arm.add(box(0.13, 0.5, 0.13, p.main, 0, -0.28, 0));
  }
  // Rifle sujeto con el brazo derecho, apuntando hacia delante.
  const rifle = new THREE.Group();
  rifle.position.set(0, -0.48, -0.1);
  rifle.add(box(0.1, 0.12, 0.6, p.dark, 0, 0, -0.18));
  rifle.add(box(0.05, 0.05, 0.2, p.dark, 0, 0.02, -0.55));
  rifle.add(box(0.04, 0.04, 0.1, p.glow, 0, 0.08, -0.1));
  rig.armR.add(rifle);
  rig.muzzle.position.set(0, -0.46, -0.72);
  rig.armR.add(rig.muzzle);
  return rig;
}

/** Rastrero: criatura encorvada, piel pálida, brazos largos con garras y ojos azules. */
function crawler(): EnemyRig {
  const p = palette(0xb8a58c, 0x5a4638, 0x3a2c26, 0x40c8ff, 3.5);
  const rig = baseRig('crawler', p);
  const hipY = 0.62;
  rig.hips.position.y = hipY;
  legs(rig, p, 0, 0.16, hipY, 0.15);
  rig.torso.position.y = 0.05;
  rig.torso.rotation.x = -0.9;
  rig.torso.add(box(0.46, 0.62, 0.3, p.main, 0, 0.3, 0));
  // Vértebras marcadas en la espalda.
  for (let i = 0; i < 4; i++)
    rig.torso.add(box(0.08, 0.06, 0.08, p.dark, 0, 0.12 + i * 0.14, 0.17));
  rig.head.position.set(0, 0.62, -0.04);
  rig.head.rotation.x = 0.8;
  rig.head.add(box(0.26, 0.22, 0.3, p.main, 0, 0.08, -0.08));
  rig.head.add(box(0.24, 0.07, 0.2, p.accent, 0, -0.03, -0.14));
  rig.head.add(box(0.05, 0.04, 0.03, p.glow, -0.07, 0.12, -0.24));
  rig.head.add(box(0.05, 0.04, 0.03, p.glow, 0.07, 0.12, -0.24));
  for (const [arm, side] of [
    [rig.armL, -1],
    [rig.armR, 1],
  ] as const) {
    arm.position.set(side * 0.3, 0.52, 0);
    arm.add(box(0.11, 0.55, 0.11, p.main, 0, -0.27, 0));
    arm.add(box(0.09, 0.45, 0.09, p.main, 0, -0.75, 0));
    for (let c = -1; c <= 1; c++)
      arm.add(box(0.025, 0.16, 0.03, p.accent, c * 0.035, -1.02, -0.02));
  }
  rig.muzzle.position.set(0, 0.2, -0.3);
  rig.head.add(rig.muzzle);
  return rig;
}

/** Escupidor: mole de piel oscura con sacos de ácido brillantes y una mandíbula enorme. */
function spitter(): EnemyRig {
  const p = palette(0x4a5a3a, 0x283020, 0x7a6a40, 0x9cff30, 2.5);
  const rig = baseRig('spitter', p);
  const hipY = 0.78;
  rig.hips.position.y = hipY;
  legs(rig, p, 0, 0.26, hipY, 0.26);
  rig.hips.add(box(0.7, 0.24, 0.45, p.dark, 0, 0, 0));
  rig.torso.position.y = 0.1;
  rig.torso.add(box(0.95, 0.8, 0.6, p.main, 0, 0.45, 0));
  // Sacos de ácido en el pecho y la espalda.
  rig.torso.add(ball(0.17, p.glow, -0.22, 0.45, -0.3));
  rig.torso.add(ball(0.13, p.glow, 0.24, 0.6, -0.3));
  rig.torso.add(ball(0.2, p.glow, 0.05, 0.62, 0.3));
  rig.head.position.set(0, 0.88, -0.1);
  rig.head.add(box(0.46, 0.32, 0.44, p.main, 0, 0.12, 0));
  const jaw = new THREE.Group();
  jaw.position.set(0, 0, -0.05);
  jaw.add(box(0.42, 0.1, 0.4, p.accent, 0, -0.04, -0.05));
  rig.head.add(jaw);
  rig.head.add(box(0.3, 0.05, 0.05, p.glow, 0, 0.2, -0.23));
  for (const [arm, side] of [
    [rig.armL, -1],
    [rig.armR, 1],
  ] as const) {
    arm.position.set(side * 0.6, 0.72, 0);
    arm.add(box(0.3, 0.3, 0.3, p.dark, 0, 0, 0));
    arm.add(box(0.22, 0.62, 0.22, p.main, 0, -0.4, 0));
    arm.add(box(0.27, 0.22, 0.27, p.dark, 0, -0.8, 0));
  }
  rig.muzzle.position.set(0, 0.05, -0.3);
  rig.head.add(rig.muzzle);
  return rig;
}

/** Vigía: orbe acorazado flotante con un gran ojo y tres aletas que giran a su alrededor. */
function watcher(): EnemyRig {
  const p = palette(0x5a5f78, 0x252838, 0xa89060, 0x40e0ff, 4);
  const rig = baseRig('watcher', p);
  rig.hips.position.y = 0.45;
  rig.torso.add(ball(0.36, p.main, 0, 0, 0, 1));
  rig.torso.add(box(0.5, 0.06, 0.5, p.dark, 0, 0, 0));
  rig.head.position.set(0, 0, -0.3);
  rig.head.add(ball(0.14, p.glow, 0, 0, 0, 1));
  rig.head.add(box(0.36, 0.05, 0.06, p.dark, 0, 0.12, 0.02));
  const fins = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Group();
    fin.rotation.y = (i / 3) * Math.PI * 2;
    fin.add(box(0.06, 0.34, 0.24, p.accent, 0, 0, 0.46));
    fin.add(box(0.04, 0.04, 0.04, p.glow, 0, 0.15, 0.55));
    fins.add(fin);
  }
  rig.torso.add(fins);
  rig.fins = fins;
  // Los "brazos" del vigía son dos antenas pequeñas.
  rig.armL.position.set(-0.2, 0.3, 0);
  rig.armL.add(box(0.03, 0.26, 0.03, p.dark, 0, 0.1, 0));
  rig.armR.position.set(0.2, 0.3, 0);
  rig.armR.add(box(0.03, 0.26, 0.03, p.dark, 0, 0.1, 0));
  rig.muzzle.position.set(0, 0, -0.15);
  rig.head.add(rig.muzzle);
  return rig;
}

const BUILDERS: Record<EnemyKind, () => EnemyRig> = { sentinel, crawler, spitter, watcher };

/**
 * Fusiona las piezas que cuelgan directamente de cada articulación y comparten material en una
 * sola malla: el modelo se sigue animando igual, pero con muchas menos llamadas de dibujo.
 * Solo proyectan sombra las piezas grandes, porque cada una se dibuja otra vez por cada sombra.
 */
function mergeJoints(root: THREE.Object3D): void {
  const groups: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) groups.push(object);
  });
  for (const group of groups) {
    const byMaterial = new Map<THREE.Material, THREE.Mesh[]>();
    for (const child of group.children) {
      if (!(child instanceof THREE.Mesh)) continue;
      const list = byMaterial.get(child.material as THREE.Material) ?? [];
      list.push(child);
      byMaterial.set(child.material as THREE.Material, list);
    }
    for (const [material, meshes] of byMaterial) {
      const geometries = meshes.map((mesh) => {
        mesh.updateMatrix();
        const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        return geometry.applyMatrix4(mesh.matrix);
      });
      const merged = mergeGeometries(geometries, false);
      for (const geometry of geometries) geometry.dispose();
      for (const mesh of meshes) {
        mesh.geometry.dispose();
        group.remove(mesh);
      }
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = (merged.boundingSphere?.radius ?? 0) > 0.25;
      group.add(mesh);
    }
  }
}

export function buildRig(kind: EnemyKind): EnemyRig {
  const rig = BUILDERS[kind]();
  rig.root.name = `enemy:${kind}`;
  mergeJoints(rig.root);
  // Guardar las rotaciones de reposo para animar sobre ellas.
  rig.root.traverse((object) => {
    object.userData.rest = object.rotation.clone();
    object.userData.restPosition = object.position.clone();
  });
  return rig;
}

export function disposeRig(rig: EnemyRig): void {
  rig.root.traverse((object) => {
    if (object instanceof THREE.Mesh) object.geometry.dispose();
  });
  for (const material of new Set(rig.flashMaterials)) material.dispose();
}

function rest(object: THREE.Object3D): THREE.Euler {
  return object.userData.rest as THREE.Euler;
}

export interface AnimationInput {
  pose: RigPose;
  /** Tiempo en la pose actual. */
  poseTime: number;
  /** Duración de la pose (ataque, dolor). */
  poseDuration: number;
  /** Velocidad horizontal (m/s) para la cadencia al andar. */
  speed: number;
  /** Tiempo total (para movimientos continuos). */
  time: number;
  /** Destello blanco al recibir daño, de 1 a 0. */
  flash: number;
  /** Altura a la que cae el cuerpo al morir, relativa a los pies (voladores). */
  deathDrop: number;
}

/** Animación procedural: caminar, atacar, recibir daño y morir (caída animada). */
export function animateRig(rig: EnemyRig, input: AnimationInput, walkPhase: number): void {
  const { pose, poseTime, poseDuration, speed, time } = input;
  const flying = rig.kind === 'watcher';
  const gait = clamp(speed / 3, 0, 1.3);

  // Punto de partida: postura de reposo.
  for (const part of [
    rig.body,
    rig.hips,
    rig.torso,
    rig.head,
    rig.armL,
    rig.armR,
    rig.legL,
    rig.legR,
  ]) {
    if (part) part.rotation.copy(rest(part));
  }
  rig.body.position.set(0, 0, 0);

  if (flying) {
    rig.body.position.y = Math.sin(time * 2.2) * 0.08;
    if (rig.fins) rig.fins.rotation.y += 0.05 + gait * 0.05;
  } else if (pose !== 'dead') {
    const swing = Math.sin(walkPhase) * 0.65 * gait;
    if (rig.legL) rig.legL.rotation.x = rest(rig.legL).x + swing;
    if (rig.legR) rig.legR.rotation.x = rest(rig.legR).x - swing;
    rig.armL.rotation.x = rest(rig.armL).x - swing * 0.7;
    rig.armR.rotation.x = rest(rig.armR).x + swing * 0.7;
    rig.body.position.y = Math.abs(Math.cos(walkPhase)) * 0.05 * gait;
    // Respiración en reposo.
    rig.torso.rotation.x = rest(rig.torso).x + Math.sin(time * 1.7) * 0.03;
  }

  const p = poseDuration > 0 ? clamp(poseTime / poseDuration, 0, 1) : 1;
  switch (pose) {
    case 'attack': {
      const raise = Math.sin(Math.min(p * 1.6, 1) * (Math.PI / 2));
      if (rig.kind === 'sentinel') {
        rig.armR.rotation.x = rest(rig.armR).x - 1.45 * raise;
        rig.armL.rotation.x = rest(rig.armL).x - 1.2 * raise;
        rig.armL.rotation.z = -0.5 * raise;
      } else if (rig.kind === 'crawler') {
        // Zarpazo: levanta los brazos y los baja con fuerza.
        const slash = p < 0.45 ? p / 0.45 : 1 - (p - 0.45) / 0.55;
        rig.armL.rotation.x = rest(rig.armL).x - 2.4 * slash;
        rig.armR.rotation.x = rest(rig.armR).x - 2.2 * slash;
        rig.torso.rotation.x = rest(rig.torso).x + 0.35 * slash;
      } else if (rig.kind === 'spitter') {
        // Se echa hacia atrás y escupe hacia delante.
        const lean = p < 0.5 ? -p * 0.8 : -0.4 + (p - 0.5) * 1.6;
        rig.torso.rotation.x = rest(rig.torso).x + lean;
        rig.head.rotation.x = rest(rig.head).x + lean * 0.8;
        rig.armL.rotation.z = -0.6 * raise;
        rig.armR.rotation.z = 0.6 * raise;
      } else {
        rig.torso.rotation.x = rest(rig.torso).x - 0.25 * raise;
      }
      break;
    }
    case 'pain': {
      const hit = Math.sin(p * Math.PI);
      rig.torso.rotation.x = rest(rig.torso).x - 0.45 * hit;
      rig.head.rotation.x = rest(rig.head).x - 0.35 * hit;
      rig.armL.rotation.z = rest(rig.armL).z - 0.5 * hit;
      rig.armR.rotation.z = rest(rig.armR).z + 0.5 * hit;
      break;
    }
    case 'dead': {
      // Caída hacia atrás con rebote suave; el volador cae hasta el suelo.
      const t = clamp(poseTime / 0.7, 0, 1);
      const fall = t * t * (3 - 2 * t);
      if (flying) {
        const drop = clamp(poseTime / 0.6, 0, 1);
        rig.body.position.y = input.deathDrop * drop * drop;
        rig.body.rotation.z = fall * 1.2;
        rig.body.rotation.x = fall * 0.6;
      } else {
        rig.body.rotation.x = rest(rig.body).x + fall * (Math.PI / 2 - 0.08);
        rig.body.position.y = fall * 0.12;
        rig.body.position.z = fall * 0.25;
        if (rig.legL) rig.legL.rotation.x = rest(rig.legL).x - fall * 0.4;
        if (rig.legR) rig.legR.rotation.x = rest(rig.legR).x - fall * 0.1;
        rig.armL.rotation.z = rest(rig.armL).z - fall * 1.1;
        rig.armR.rotation.z = rest(rig.armR).z + fall * 0.9;
        rig.head.rotation.x = rest(rig.head).x - fall * 0.4;
      }
      break;
    }
  }

  for (const material of rig.flashMaterials) {
    material.emissive.setScalar(input.flash * 0.9);
  }
}
