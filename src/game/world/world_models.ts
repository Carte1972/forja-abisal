import * as THREE from 'three';
import type { PickupId } from './pickup_rules';

/**
 * Modelos de los objetos que se recogen y del interruptor de salida, hechos con primitivas.
 * Diseños originales. Las geometrías y materiales se comparten entre copias.
 */

const geometry = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  sphere: new THREE.IcosahedronGeometry(0.5, 1),
  torus: new THREE.TorusGeometry(0.35, 0.08, 8, 16),
};

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

function material(color: number, emissive = 0, intensity = 0): THREE.MeshStandardMaterial {
  const key = `${color}:${emissive}:${intensity}`;
  let cached = materialCache.get(key);
  if (!cached) {
    cached = new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(emissive),
      emissiveIntensity: intensity,
      roughness: 0.45,
      metalness: 0.3,
      flatShading: true,
    });
    materialCache.set(key, cached);
  }
  return cached;
}

function part(
  shape: keyof typeof geometry,
  mat: THREE.Material,
  scale: [number, number, number],
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry[shape], mat);
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}

const KEY_COLORS = { red: 0xff3020, blue: 0x2a70ff, yellow: 0xffc81e } as const;

/** Tarjeta de acceso con núcleo brillante. */
function keycard(color: number): THREE.Group {
  const group = new THREE.Group();
  group.add(part('box', material(0x2a2c30), [0.34, 0.46, 0.05]));
  group.add(part('box', material(color, color, 2.5), [0.24, 0.12, 0.06], [0, 0.1, 0]));
  group.add(part('box', material(color, color, 2.5), [0.06, 0.18, 0.06], [0, -0.1, 0]));
  return group;
}

function medkit(size: number, glow: number): THREE.Group {
  const group = new THREE.Group();
  group.add(part('box', material(0xe8e4dc), [0.5 * size, 0.32 * size, 0.34 * size]));
  group.add(
    part(
      'box',
      material(0x30c0ff, 0x30c0ff, glow),
      [0.3 * size, 0.08 * size, 0.36 * size],
      [0, 0, 0],
    ),
  );
  group.add(
    part(
      'box',
      material(0x30c0ff, 0x30c0ff, glow),
      [0.08 * size, 0.08 * size, 0.36 * size],
      [0, 0, 0],
      [0, 0, Math.PI / 2],
    ),
  );
  group.add(
    part(
      'box',
      material(0x30c0ff, 0x30c0ff, glow),
      [0.3 * size, 0.34 * size, 0.08 * size],
      [0, 0, 0.14 * size],
    ),
  );
  return group;
}

function vial(): THREE.Group {
  const group = new THREE.Group();
  group.add(part('cylinder', material(0x40d0ff, 0x40d0ff, 2), [0.16, 0.3, 0.16]));
  group.add(part('cylinder', material(0x505560), [0.18, 0.06, 0.18], [0, 0.18, 0]));
  return group;
}

function armor(large: boolean): THREE.Group {
  const group = new THREE.Group();
  const s = large ? 1 : 0.55;
  group.add(part('box', material(0x4a6a50), [0.6 * s, 0.55 * s, 0.18 * s]));
  group.add(
    part('box', material(0x2a3a2e), [0.22 * s, 0.25 * s, 0.2 * s], [-0.36 * s, 0.14 * s, 0]),
  );
  group.add(
    part('box', material(0x2a3a2e), [0.22 * s, 0.25 * s, 0.2 * s], [0.36 * s, 0.14 * s, 0]),
  );
  group.add(
    part('box', material(0x60ff90, 0x60ff90, 2.5), [0.3 * s, 0.06 * s, 0.2 * s], [0, 0.08 * s, 0]),
  );
  return group;
}

function ammoBox(color: number, width: number): THREE.Group {
  const group = new THREE.Group();
  group.add(part('box', material(0x5a4a30), [width, 0.26, 0.3]));
  group.add(part('box', material(color, color, 1.8), [width * 0.8, 0.06, 0.32], [0, 0.06, 0]));
  return group;
}

function charges(): THREE.Group {
  const group = new THREE.Group();
  for (const x of [-0.12, 0.12]) {
    group.add(
      part('cylinder', material(0x3a3c42), [0.16, 0.42, 0.16], [x, 0, 0], [Math.PI / 2, 0, 0]),
    );
    group.add(part('sphere', material(0xff6a1f, 0xff6a1f, 3), [0.1, 0.1, 0.1], [x, 0, -0.22]));
  }
  return group;
}

/** Silueta simplificada del arma para el objeto del suelo. */
function weaponPickup(length: number, accent: number): THREE.Group {
  const group = new THREE.Group();
  group.add(part('box', material(0x5a606a), [0.14, 0.14, length]));
  group.add(part('box', material(0x3a2a20), [0.1, 0.22, 0.12], [0, -0.14, length * 0.25]));
  group.add(part('box', material(accent, accent, 2.5), [0.15, 0.04, length * 0.5], [0, 0.08, 0]));
  return group;
}

const BUILDERS: Record<PickupId, () => THREE.Group> = {
  health_small: vial,
  health: () => medkit(1, 2),
  health_large: () => medkit(1.5, 2.5),
  armor_small: () => armor(false),
  armor: () => armor(true),
  ammo_bullets: () => ammoBox(0xffc040, 0.4),
  ammo_shells: () => ammoBox(0xff7030, 0.34),
  ammo_charges: charges,
  weapon_shotgun: () => weaponPickup(0.8, 0xffb040),
  weapon_riveter: () => weaponPickup(0.7, 0xff6a1f),
  weapon_launcher: () => weaponPickup(0.9, 0x40e0ff),
  key_red: () => keycard(KEY_COLORS.red),
  key_blue: () => keycard(KEY_COLORS.blue),
  key_yellow: () => keycard(KEY_COLORS.yellow),
};

/** Objeto flotante con un aro de luz en el suelo. El grupo raíz está en los pies. */
export function buildPickupModel(id: PickupId): { root: THREE.Group; spinner: THREE.Group } {
  const root = new THREE.Group();
  const spinner = BUILDERS[id]();
  spinner.position.y = 0.55;
  root.add(spinner);
  const isKey = id.startsWith('key_');
  const ringColor = isKey ? KEY_COLORS[id.slice(4) as keyof typeof KEY_COLORS] : 0xffd9a0;
  const ring = part(
    'torus',
    material(ringColor, ringColor, isKey ? 2 : 0.8),
    [1, 1, 1],
    [0, 0.03, 0],
    [Math.PI / 2, 0, 0],
  );
  root.add(ring);
  root.name = `pickup:${id}`;
  return { root, spinner };
}

/** Interruptor de salida: columna con pantalla y botón luminoso. `on` cambia su color al usarlo. */
export function buildExitSwitch(): { root: THREE.Group; setOn(on: boolean): void } {
  const root = new THREE.Group();
  root.add(part('box', material(0x3a3c42), [0.7, 1.3, 0.5], [0, 0.65, 0]));
  root.add(part('box', material(0x2a2c30), [0.8, 0.1, 0.6], [0, 1.35, 0]));
  root.add(part('box', material(0xd0a020), [0.72, 0.08, 0.52], [0, 0.1, 0]));
  const screenOff = material(0x301008, 0xff3020, 2.5);
  const screenOn = material(0x083010, 0x40ff70, 3);
  const screen = part('box', screenOff, [0.46, 0.34, 0.04], [0, 1.0, -0.26]);
  root.add(screen);
  const button = part(
    'cylinder',
    screenOff,
    [0.16, 0.08, 0.16],
    [0, 0.62, -0.28],
    [Math.PI / 2, 0, 0],
  );
  root.add(button);
  root.name = 'exit_switch';
  return {
    root,
    setOn(on: boolean) {
      screen.material = on ? screenOn : screenOff;
      button.material = on ? screenOn : screenOff;
    },
  };
}
