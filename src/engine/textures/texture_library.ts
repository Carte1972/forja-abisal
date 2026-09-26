import * as THREE from 'three';
import { normalMapFromHeight } from './normal_map';
import { generateTexture, hasTexture, TEXTURE_CATALOG, TEXTURE_SIZE } from './texture_catalog';

export interface MaterialLibrary {
  get(texture: string): THREE.Material;
  /** Anima los materiales que lo necesitan (lava, ácido). */
  update(time: number): void;
  dispose(): void;
}

interface FlowingMaterial {
  material: THREE.MeshStandardMaterial;
  textures: THREE.Texture[];
  baseIntensity: number;
}

function canvasTexture(
  data: Uint8ClampedArray,
  size: number,
  colorSpace: THREE.ColorSpace,
  anisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no admite canvas 2D');
  context.putImageData(new ImageData(new Uint8ClampedArray(data), size, size), 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // Píxeles nítidos de cerca; mipmaps para que no parpadee a lo lejos.
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.anisotropy = anisotropy;
  return texture;
}

/**
 * Materiales con texturas procedurales generadas en canvas la primera vez que se piden
 * (al construir el nivel, es decir, al arrancar). La luz del sector llega en los colores
 * de vértice; el emisivo no se ve afectado por ella, así que la lava brilla siempre.
 */
export class ProceduralMaterials implements MaterialLibrary {
  private readonly cache = new Map<string, THREE.MeshStandardMaterial>();
  private readonly flowing: FlowingMaterial[] = [];
  private readonly textures: THREE.Texture[] = [];
  private readonly warned = new Set<string>();

  constructor(private readonly anisotropy = 4) {}

  get(name: string): THREE.Material {
    const cached = this.cache.get(name);
    if (cached) return cached;
    if (!hasTexture(name) && !this.warned.has(name)) {
      this.warned.add(name);
      console.warn(`Textura desconocida "${name}": se usa la textura "missing"`);
    }
    const def = TEXTURE_CATALOG[name] ?? TEXTURE_CATALOG.missing!;
    const generated = generateTexture(name);
    const map = this.track(
      canvasTexture(generated.albedo.data, TEXTURE_SIZE, THREE.SRGBColorSpace, this.anisotropy),
    );
    const material = new THREE.MeshStandardMaterial({
      map,
      roughness: def.roughness,
      metalness: def.metalness,
      vertexColors: true,
    });
    material.name = name;

    if (def.normalStrength > 0) {
      const normals = normalMapFromHeight(
        generated.albedo.luminance(),
        TEXTURE_SIZE,
        def.normalStrength,
      );
      material.normalMap = this.track(
        canvasTexture(normals, TEXTURE_SIZE, THREE.NoColorSpace, this.anisotropy),
      );
    }

    if (generated.emissive) {
      material.emissiveMap = this.track(
        canvasTexture(generated.emissive.data, TEXTURE_SIZE, THREE.SRGBColorSpace, this.anisotropy),
      );
      material.emissive = new THREE.Color(0xffffff);
      material.emissiveIntensity = def.emissiveIntensity ?? 1;
      if (def.flowing) {
        this.flowing.push({
          material,
          textures: [
            map,
            material.emissiveMap,
            ...(material.normalMap ? [material.normalMap] : []),
          ],
          baseIntensity: material.emissiveIntensity,
        });
      }
    }

    this.cache.set(name, material);
    return material;
  }

  update(time: number): void {
    for (const entry of this.flowing) {
      // La superficie fluye despacio y el brillo late.
      for (const texture of entry.textures) texture.offset.set(time * 0.03, time * 0.017);
      entry.material.emissiveIntensity =
        entry.baseIntensity * (0.8 + 0.2 * Math.sin(time * 1.7) + 0.08 * Math.sin(time * 4.3));
    }
  }

  dispose(): void {
    for (const material of this.cache.values()) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.cache.clear();
    this.flowing.length = 0;
    this.textures.length = 0;
  }

  private track<T extends THREE.Texture>(texture: T): T {
    this.textures.push(texture);
    return texture;
  }
}
