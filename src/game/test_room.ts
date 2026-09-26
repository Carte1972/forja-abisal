import * as THREE from 'three';
import type { PhysicsWorld, Vec3 } from '../engine/physics/physics_world';
import type { PlayerSpawn } from './player/player';

/**
 * Sala de prueba de la fase 1: suelo, paredes, escaleras, rampa practicable, rampa
 * demasiado empinada, cajas para saltar y un hueco bajo por el que solo se pasa agachado.
 * Se sustituirá por los niveles generados desde sectores en la fase 2.
 */

const ROOM = 40;
const ROOM_HEIGHT = 8;

const COLORS = {
  floor: 0x4a4540,
  ceiling: 0x2a2624,
  wall: 0x6d4b3a,
  step: 0x8a7a5a,
  ramp: 0x4f7384,
  steep: 0x8a3b2e,
  crate: 0xa0552c,
  pillar: 0x5c5f66,
  slab: 0x6b6f3a,
};

interface BlockSpec {
  center: Vec3;
  size: Vec3;
  color: number;
  /** Rotación en radianes alrededor del eje X (rampas). */
  pitch?: number;
}

export function buildTestRoom(scene: THREE.Scene, physics: PhysicsWorld): PlayerSpawn {
  const materials = new Map<number, THREE.MeshStandardMaterial>();
  const materialFor = (color: number) => {
    let material = materials.get(color);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
      materials.set(color, material);
    }
    return material;
  };

  const addBlock = ({ center, size, color, pitch = 0 }: BlockSpec) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), materialFor(color));
    mesh.position.set(center.x, center.y, center.z);
    mesh.rotation.x = pitch;
    scene.add(mesh);
    physics.addStaticBox(
      center,
      { x: size.x / 2, y: size.y / 2, z: size.z / 2 },
      new THREE.Quaternion().setFromEuler(mesh.rotation),
    );
  };

  /** Rampa que sube hacia -Z: su borde bajo toca el suelo en `lowZ` y alcanza `rise` metros. */
  const addRamp = (
    x: number,
    lowZ: number,
    width: number,
    angleDeg: number,
    rise: number,
    color: number,
  ) => {
    const angle = THREE.MathUtils.degToRad(angleDeg);
    const length = rise / Math.sin(angle);
    const thickness = 0.4;
    const centerZ = lowZ - (length * Math.cos(angle)) / 2;
    addBlock({
      center: {
        x,
        y: rise / 2 - (thickness / 2) * Math.cos(angle),
        z: centerZ - (thickness / 2) * Math.sin(angle),
      },
      size: { x: width, y: thickness, z: length },
      color,
      pitch: angle,
    });
    return centerZ - (length * Math.cos(angle)) / 2;
  };

  // Suelo, techo y paredes.
  const half = ROOM / 2;
  addBlock({
    center: { x: 0, y: -0.5, z: 0 },
    size: { x: ROOM, y: 1, z: ROOM },
    color: COLORS.floor,
  });
  addBlock({
    center: { x: 0, y: ROOM_HEIGHT + 0.5, z: 0 },
    size: { x: ROOM, y: 1, z: ROOM },
    color: COLORS.ceiling,
  });
  for (const [x, z, sx, sz] of [
    [0, -half - 0.5, ROOM + 2, 1],
    [0, half + 0.5, ROOM + 2, 1],
    [-half - 0.5, 0, 1, ROOM],
    [half + 0.5, 0, 1, ROOM],
  ] as const) {
    addBlock({
      center: { x, y: ROOM_HEIGHT / 2, z },
      size: { x: sx, y: ROOM_HEIGHT, z: sz },
      color: COLORS.wall,
    });
  }

  // Escalera de 8 peldaños de 25 cm que sube a una plataforma de 2 m.
  const stepHeight = 0.25;
  const stepDepth = 0.6;
  const stairsX = -12;
  const stairsStartZ = 6;
  for (let i = 0; i < 8; i++) {
    const h = (i + 1) * stepHeight;
    addBlock({
      center: { x: stairsX, y: h / 2, z: stairsStartZ - i * stepDepth - stepDepth / 2 },
      size: { x: 4, y: h, z: stepDepth },
      color: COLORS.step,
    });
  }
  const stairsEndZ = stairsStartZ - 8 * stepDepth;
  addBlock({
    center: { x: stairsX, y: 1, z: stairsEndZ - 4 },
    size: { x: 8, y: 2, z: 8 },
    color: COLORS.step,
  });

  // Rampa de 18° que sube a una plataforma.
  const rampTopZ = addRamp(12, 8, 4, 18, 2.5, COLORS.ramp);
  addBlock({
    center: { x: 12, y: 1.25, z: rampTopZ - 3 },
    size: { x: 6, y: 2.5, z: 6 },
    color: COLORS.ramp,
  });

  // Rampa de 55°: demasiado empinada, el jugador resbala.
  addRamp(0, -10, 4, 55, 3, COLORS.steep);

  // Cajas para saltar (una alcanzable y otra demasiado alta).
  addBlock({
    center: { x: 4, y: 0.5, z: 10 },
    size: { x: 1.5, y: 1, z: 1.5 },
    color: COLORS.crate,
  });
  addBlock({
    center: { x: 6.5, y: 1.1, z: 10 },
    size: { x: 1.5, y: 2.2, z: 1.5 },
    color: COLORS.crate,
  });

  // Losa baja: solo se pasa por debajo agachado (hueco de 1,3 m).
  addBlock({
    center: { x: -4, y: 1.3 + 0.3, z: 10 },
    size: { x: 3, y: 0.6, z: 4 },
    color: COLORS.slab,
  });
  addBlock({
    center: { x: -5.75, y: 0.95, z: 10 },
    size: { x: 0.5, y: 1.9, z: 4 },
    color: COLORS.slab,
  });
  addBlock({
    center: { x: -2.25, y: 0.95, z: 10 },
    size: { x: 0.5, y: 1.9, z: 4 },
    color: COLORS.slab,
  });

  // Columnas como referencia visual.
  for (const [x, z] of [
    [-6, -14],
    [6, -14],
    [-16, 14],
    [16, 14],
  ] as const) {
    addBlock({
      center: { x, y: ROOM_HEIGHT / 2, z },
      size: { x: 1.2, y: ROOM_HEIGHT, z: 1.2 },
      color: COLORS.pillar,
    });
  }

  // Rejilla en el suelo para percibir el movimiento (hasta tener texturas en la fase 3).
  const grid = new THREE.GridHelper(ROOM, ROOM, 0x8a6a50, 0x5e5048);
  grid.position.y = 0.01;
  scene.add(grid);

  // Iluminación provisional.
  scene.background = new THREE.Color(0x0d0908);
  scene.add(new THREE.HemisphereLight(0xc8d0ff, 0x3a2a20, 1.4));
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  for (const [x, z, color] of [
    [-10, -8, 0xffb070],
    [10, -8, 0x80b0ff],
    [0, 10, 0xffe0b0],
  ] as const) {
    const light = new THREE.PointLight(color, 40, 25, 1.5);
    light.position.set(x, ROOM_HEIGHT - 1, z);
    scene.add(light);
  }

  return { position: { x: 0, y: 0, z: 16 }, yaw: 0 };
}
