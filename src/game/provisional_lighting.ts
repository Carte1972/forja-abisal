import * as THREE from 'three';

/**
 * Iluminación provisional hasta la fase 3 (luces de lámparas, niebla y post-procesado).
 * La luz de cada sector ya llega horneada en los colores de vértice.
 */
export function addProvisionalLighting(scene: THREE.Scene): void {
  scene.background = new THREE.Color(0x4a5a78);
  scene.add(new THREE.HemisphereLight(0xdde4ff, 0x4a3a30, 1.6));
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.2);
  sun.position.set(0.4, 1, 0.3);
  scene.add(sun);
}
