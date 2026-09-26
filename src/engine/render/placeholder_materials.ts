import * as THREE from 'three';

export interface MaterialLibrary {
  get(texture: string): THREE.Material;
  dispose(): void;
}

/**
 * Materiales provisionales de color plano derivado del nombre de la textura, con la luz del
 * sector en los colores de vértice. Se sustituirán por texturas procedurales en la fase 3.
 */
export class PlaceholderMaterials implements MaterialLibrary {
  private readonly cache = new Map<string, THREE.MeshStandardMaterial>();

  get(texture: string): THREE.Material {
    let material = this.cache.get(texture);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color: colorFor(texture),
        vertexColors: true,
        roughness: 0.9,
        metalness: 0.05,
      });
      if (texture.includes('lava')) {
        material.emissive = new THREE.Color(0xff4a10);
        material.emissiveIntensity = 0.8;
      }
      this.cache.set(texture, material);
    }
    return material;
  }

  dispose(): void {
    for (const material of this.cache.values()) material.dispose();
    this.cache.clear();
  }
}

function colorFor(name: string): THREE.Color {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hue = ((hash >>> 0) % 360) / 360;
  return new THREE.Color().setHSL(hue, 0.35, 0.45);
}
