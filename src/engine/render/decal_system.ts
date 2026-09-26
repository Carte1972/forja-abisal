import * as THREE from 'three';
import { bulletHolePixels, scorchPixels } from '../textures/decal_textures';

type V3 = { x: number; y: number; z: number };

function alphaTexture(data: Uint8ClampedArray, size: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas
    .getContext('2d')!
    .putImageData(new ImageData(new Uint8ClampedArray(data), size, size), 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

/** Marcas en un búfer circular instanciado: al llegar al máximo se reutiliza la más antigua. */
class DecalRing {
  readonly mesh: THREE.InstancedMesh;
  private next = 0;
  private readonly matrix = new THREE.Matrix4();
  private readonly quaternion = new THREE.Quaternion();
  private readonly spin = new THREE.Quaternion();
  private readonly normal = new THREE.Vector3();
  private readonly position = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();

  constructor(
    texture: THREE.Texture,
    private readonly capacity: number,
    name: string,
  ) {
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      roughness: 1,
      // Evita que la marca parpadee contra la superficie en la que está pegada.
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, capacity);
    this.mesh.name = name;
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 0;
  }

  add(point: V3, normal: V3, size: number, rotation: number): void {
    this.normal.set(normal.x, normal.y, normal.z).normalize();
    this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.normal);
    this.spin.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotation);
    this.quaternion.multiply(this.spin);
    this.position.set(point.x, point.y, point.z).addScaledVector(this.normal, 0.004);
    this.scale.set(size, size, 1);
    this.matrix.compose(this.position, this.quaternion, this.scale);
    this.mesh.setMatrixAt(this.next, this.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.next = (this.next + 1) % this.capacity;
    this.mesh.count = Math.min(this.mesh.count + 1, this.capacity);
  }

  clear(): void {
    this.mesh.count = 0;
    this.next = 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    const material = this.mesh.material as THREE.MeshStandardMaterial;
    material.map?.dispose();
    material.dispose();
  }
}

/** Agujeros de bala y quemaduras de explosión con un límite máximo cada uno. */
export class DecalSystem {
  readonly group = new THREE.Group();
  private readonly holes = new DecalRing(
    alphaTexture(bulletHolePixels(32, 7), 32),
    160,
    'bullet_holes',
  );
  private readonly scorches = new DecalRing(alphaTexture(scorchPixels(64, 11), 64), 24, 'scorches');

  constructor() {
    this.group.name = 'decals';
    this.group.add(this.holes.mesh, this.scorches.mesh);
  }

  bulletHole(point: V3, normal: V3, random: number): void {
    this.holes.add(point, normal, 0.11 + random * 0.05, random * Math.PI * 2);
  }

  scorch(point: V3, normal: V3, radius: number, random: number): void {
    this.scorches.add(point, normal, radius * 1.1, random * Math.PI * 2);
  }

  clear(): void {
    this.holes.clear();
    this.scorches.clear();
  }

  dispose(): void {
    this.holes.dispose();
    this.scorches.dispose();
  }
}
