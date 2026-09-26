import * as THREE from 'three';
import type { WeaponId } from './weapon_defs';

/**
 * Modelos en primera persona construidos con primitivas (diseño original). Están en el espacio
 * de la cámara del arma: X a la derecha, Y arriba y el cañón apuntando a -Z.
 */

export interface Viewmodel {
  root: THREE.Group;
  /** Punto de salida del disparo (fogonazo y proyectiles). */
  muzzle: THREE.Object3D;
  flash: THREE.Group;
  /** Piezas animadas específicas de cada arma. */
  parts: { barrels?: THREE.Object3D; drum?: THREE.Object3D; head?: THREE.Object3D };
  /** Posición de reposo en pantalla. */
  rest: THREE.Vector3;
}

const materials = {
  // Metalicidad baja: sin mapa de entorno, un metal muy metálico se vería negro.
  gunmetal: new THREE.MeshStandardMaterial({ color: 0x7a808a, metalness: 0.25, roughness: 0.45 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x3e434b, metalness: 0.2, roughness: 0.5 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc09848, metalness: 0.35, roughness: 0.35 }),
  grip: new THREE.MeshStandardMaterial({ color: 0x5a4030, metalness: 0, roughness: 0.85 }),
  hazard: new THREE.MeshStandardMaterial({ color: 0xd0a020, metalness: 0.1, roughness: 0.6 }),
  ember: new THREE.MeshStandardMaterial({
    color: 0x401008,
    emissive: new THREE.Color(0xff6a1f),
    emissiveIntensity: 2.5,
  }),
  cyan: new THREE.MeshStandardMaterial({
    color: 0x082028,
    emissive: new THREE.Color(0x40e0ff),
    emissiveIntensity: 3,
  }),
  flash: new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xffc070).multiplyScalar(4),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
};

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Cilindro a lo largo del eje Z (como un cañón). */
function tube(
  radius: number,
  length: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  sides = 10,
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, sides), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
}

function muzzleFlash(size: number): THREE.Group {
  const flash = new THREE.Group();
  const star = new THREE.PlaneGeometry(size, size);
  for (let i = 0; i < 3; i++) {
    const plane = new THREE.Mesh(star, materials.flash);
    plane.rotation.z = (i * Math.PI) / 3;
    flash.add(plane);
  }
  const side = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.5, size * 1.6), materials.flash);
  side.rotation.x = Math.PI / 2;
  side.position.z = -size * 0.5;
  flash.add(side);
  flash.visible = false;
  return flash;
}

function finish(
  root: THREE.Group,
  muzzleZ: number,
  muzzleY: number,
  flashSize: number,
  rest: THREE.Vector3,
  parts: Viewmodel['parts'] = {},
): Viewmodel {
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, muzzleY, muzzleZ);
  root.add(muzzle);
  const flash = muzzleFlash(flashSize);
  muzzle.add(flash);
  root.position.copy(rest);
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) object.frustumCulled = false;
  });
  return { root, muzzle, flash, parts, rest };
}

function hammer(): Viewmodel {
  const root = new THREE.Group();
  // Mango casi vertical sujeto en la mano derecha.
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.027, 0.46, 8), materials.grip);
  handle.position.y = -0.12;
  root.add(handle);
  root.add(box(0.05, 0.03, 0.05, materials.dark, 0, -0.34, 0));
  // Cabeza de ariete apuntando hacia delante, con pistones de latón a los lados.
  const head = new THREE.Group();
  head.position.set(0, 0.14, -0.02);
  head.add(box(0.1, 0.1, 0.26, materials.gunmetal));
  head.add(box(0.108, 0.108, 0.05, materials.hazard, 0, 0, -0.11));
  head.add(box(0.07, 0.07, 0.02, materials.dark, 0, 0, -0.14));
  for (const side of [-1, 1])
    head.add(tube(0.016, 0.18, materials.brass, side * 0.062, 0.025, 0.02));
  head.add(box(0.04, 0.03, 0.04, materials.ember, 0, 0.06, 0.07));
  root.add(head);
  root.rotation.set(-0.3, 0.35, -0.12);
  return finish(root, -0.3, 0.14, 0.01, new THREE.Vector3(0.24, -0.2, -0.46), { head });
}

function pistol(): Viewmodel {
  const root = new THREE.Group();
  root.add(box(0.05, 0.05, 0.24, materials.gunmetal, 0, 0.02, -0.04));
  root.add(box(0.046, 0.03, 0.2, materials.dark, 0, -0.018, -0.03));
  const grip = box(0.042, 0.13, 0.06, materials.grip, 0, -0.08, 0.05);
  grip.rotation.x = 0.28;
  root.add(grip);
  root.add(tube(0.012, 0.05, materials.dark, 0, 0.02, -0.18));
  root.add(box(0.052, 0.008, 0.12, materials.ember, 0, 0.0, -0.06));
  root.add(box(0.012, 0.012, 0.012, materials.cyan, 0, 0.052, 0.06));
  return finish(root, -0.21, 0.02, 0.12, new THREE.Vector3(0.17, -0.16, -0.5));
}

function shotgun(): Viewmodel {
  const root = new THREE.Group();
  root.add(box(0.1, 0.07, 0.16, materials.gunmetal, 0, 0, 0.06));
  const stock = box(0.07, 0.09, 0.22, materials.grip, 0, -0.04, 0.24);
  stock.rotation.x = 0.15;
  root.add(stock);
  // Los cañones cuelgan de una bisagra delante del cajón para abrirse al recargar.
  const barrels = new THREE.Group();
  barrels.position.set(0, -0.01, -0.02);
  for (const side of [-1, 1])
    barrels.add(tube(0.024, 0.52, materials.dark, side * 0.026, 0.02, -0.26, 12));
  barrels.add(box(0.1, 0.03, 0.2, materials.grip, 0, -0.025, -0.16));
  barrels.add(box(0.11, 0.012, 0.03, materials.hazard, 0, 0.042, -0.48));
  root.add(barrels);
  return finish(root, -0.54, 0.01, 0.2, new THREE.Vector3(0.2, -0.22, -0.42), { barrels });
}

function riveter(): Viewmodel {
  const root = new THREE.Group();
  root.add(box(0.1, 0.1, 0.3, materials.gunmetal, 0, 0, 0));
  root.add(box(0.06, 0.05, 0.18, materials.brass, 0, 0.07, 0.02));
  const grip = box(0.05, 0.12, 0.06, materials.grip, 0, -0.1, 0.1);
  grip.rotation.x = 0.25;
  root.add(grip);
  // Tambor giratorio con los tubos de remaches.
  const drum = new THREE.Group();
  drum.position.set(0, -0.005, -0.2);
  drum.add(tube(0.07, 0.1, materials.dark, 0, 0, 0, 8));
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    drum.add(
      tube(0.013, 0.14, materials.brass, Math.cos(angle) * 0.045, Math.sin(angle) * 0.045, -0.03),
    );
  }
  root.add(drum);
  root.add(tube(0.02, 0.1, materials.dark, 0, -0.005, -0.3));
  root.add(box(0.105, 0.01, 0.1, materials.ember, 0, 0.03, 0.05));
  return finish(root, -0.36, -0.005, 0.16, new THREE.Vector3(0.22, -0.22, -0.46), { drum });
}

function launcher(): Viewmodel {
  const root = new THREE.Group();
  root.add(tube(0.075, 0.6, materials.gunmetal, 0, 0, -0.05, 12));
  root.add(tube(0.085, 0.05, materials.dark, 0, 0, -0.35, 12));
  root.add(tube(0.082, 0.04, materials.hazard, 0, 0, 0.2, 12));
  // Ventana lateral que deja ver la carga incandescente.
  root.add(box(0.02, 0.05, 0.26, materials.ember, -0.07, 0.01, -0.02));
  root.add(box(0.03, 0.03, 0.08, materials.cyan, 0, 0.085, 0.05));
  const grip = box(0.05, 0.14, 0.06, materials.grip, 0, -0.12, 0.08);
  grip.rotation.x = 0.2;
  root.add(grip);
  root.scale.setScalar(0.85);
  return finish(root, -0.38, 0, 0.28, new THREE.Vector3(0.26, -0.25, -0.58));
}

const BUILDERS: Record<WeaponId, () => Viewmodel> = { hammer, pistol, shotgun, riveter, launcher };

export function buildViewmodels(): Record<WeaponId, Viewmodel> {
  return {
    hammer: BUILDERS.hammer(),
    pistol: BUILDERS.pistol(),
    shotgun: BUILDERS.shotgun(),
    riveter: BUILDERS.riveter(),
    launcher: BUILDERS.launcher(),
  };
}

export function disposeViewmodels(models: Record<WeaponId, Viewmodel>): void {
  for (const model of Object.values(models)) {
    model.root.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
  }
}
