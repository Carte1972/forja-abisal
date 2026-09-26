import * as THREE from 'three';

/**
 * Cargador glTF opcional para modelos hechos en Blender (things de tipo "model").
 * GLTFLoader se importa bajo demanda para no aumentar el bundle si ningún nivel lo usa.
 * Las rutas relativas se resuelven desde la carpeta `public/` del proyecto.
 */
export async function loadGltfModel(url: string): Promise<THREE.Group> {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const resolved = /^(https?:)?\//.test(url) ? url : `${import.meta.env.BASE_URL}${url}`;
  const gltf = await new GLTFLoader().loadAsync(resolved);
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials: THREE.Material[] = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      // Aspecto retro nítido, igual que las texturas procedurales.
      if ('map' in material && material.map instanceof THREE.Texture) {
        material.map.magFilter = THREE.NearestFilter;
        material.map.needsUpdate = true;
      }
    }
  });
  return gltf.scene;
}
