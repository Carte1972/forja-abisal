import * as THREE from 'three';
import { flashFalloff, flickerFactor, selectLamps, type FlickerMode } from './light_effects';

export interface Lamp {
  /** Posición de la pantalla de la lámpara (la luz queda un poco por debajo). */
  position: { x: number; y: number; z: number };
  color: number;
  /** Intensidad relativa (1 = normal). */
  intensity: number;
  radius: number;
  flicker: FlickerMode;
  shadows: boolean;
  seed: number;
  /** Altura del poste bajo la pantalla (farolas en exteriores); 0 = sin poste. */
  post: number;
}

export interface SunLight {
  color: number;
  intensity: number;
  direction: [number, number, number];
}

/** Caja que envuelve el nivel, para ajustar la cámara de sombras del sol. */
export interface Bounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface LightSystemOptions {
  /** Luces puntuales para lámparas (incluidas las que dan sombra). */
  lampSlots: number;
  /** Cuántas de ellas proyectan sombras. */
  shadowSlots: number;
  /** Luces para destellos breves: disparos y explosiones. */
  flashSlots: number;
}

const DEFAULT_OPTIONS: LightSystemOptions = { lampSlots: 6, shadowSlots: 1, flashSlots: 3 };
/** Conversión de la intensidad relativa de los niveles a candelas de Three.js. */
const CANDELA_PER_UNIT = 30;
/** La luz se coloca bajo la pantalla para no quedar pegada al techo. */
const LIGHT_DROP = 0.35;
/** Cada cuánto se reasignan las lámparas a las luces reales. */
const REASSIGN_INTERVAL = 0.2;

interface Flash {
  light: THREE.PointLight;
  start: number;
  duration: number;
  peak: number;
}

/**
 * Iluminación dinámica con un número fijo de luces (así los shaders no se recompilan):
 * las lámparas más cercanas a la cámara ocupan las luces disponibles, y las demás solo
 * se ven por su pantalla emisiva. También gestiona los destellos breves y la luz ambiental.
 */
export class LightSystem {
  readonly group = new THREE.Group();
  private readonly options: LightSystemOptions;
  private readonly lampLights: THREE.PointLight[] = [];
  private readonly assigned: (number | null)[] = [];
  private readonly flashes: Flash[] = [];
  private readonly ambient = new THREE.AmbientLight(0xffffff, 0.5);
  private readonly hemisphere = new THREE.HemisphereLight(0xffffff, 0x201810, 0.5);
  private lamps: Lamp[] = [];
  private fixtures: THREE.InstancedMesh | null = null;
  private posts: THREE.InstancedMesh | null = null;
  private sun: THREE.DirectionalLight | null = null;
  private sunIntensity = 0;
  private ambientIntensity = 0.5;
  private shadowsEnabled = true;
  private readonly fixtureColor = new THREE.Color();
  private lastAssign = -Infinity;
  private time = 0;

  constructor(options: Partial<LightSystemOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.group.name = 'lights';
    this.group.add(this.ambient, this.hemisphere);

    for (let i = 0; i < this.options.lampSlots; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 10, 2);
      if (i < this.options.shadowSlots) {
        light.castShadow = true;
        light.shadow.mapSize.set(512, 512);
        light.shadow.bias = -0.004;
        light.shadow.normalBias = 0.03;
        light.shadow.camera.near = 0.1;
      }
      this.lampLights.push(light);
      this.assigned.push(null);
      this.group.add(light);
    }
    for (let i = 0; i < this.options.flashSlots; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 8, 2);
      this.flashes.push({ light, start: -Infinity, duration: 0, peak: 0 });
      this.group.add(light);
    }
  }

  setAmbient(color: number, intensity: number): void {
    this.ambient.color.setHex(color);
    this.hemisphere.color.setHex(color);
    this.ambientIntensity = intensity;
    this.applyAmbient();
  }

  /**
   * Sol direccional que proyecta sombras sobre todo el nivel: los techos y paredes lo tapan,
   * así que solo ilumina las zonas abiertas. Sin sombras se apagaría también en interiores
   * de forma incorrecta, así que en ese caso se apaga y se refuerza la luz ambiental.
   */
  setSun(sun: SunLight | null, bounds: Bounds): void {
    if (this.sun) {
      this.group.remove(this.sun, this.sun.target);
      this.sun.dispose();
      this.sun = null;
    }
    if (sun) {
      const light = new THREE.DirectionalLight(sun.color, 0);
      const dir = new THREE.Vector3(...sun.direction).normalize();
      const center = new THREE.Vector3(
        (bounds.min.x + bounds.max.x) / 2,
        (bounds.min.y + bounds.max.y) / 2,
        (bounds.min.z + bounds.max.z) / 2,
      );
      const radius =
        new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z).distanceTo(center) + 1;
      light.position.copy(center).addScaledVector(dir, -radius * 2);
      light.target.position.copy(center);
      light.castShadow = true;
      light.shadow.mapSize.set(2048, 2048);
      light.shadow.bias = -0.0015;
      light.shadow.normalBias = 0.04;
      const cam = light.shadow.camera;
      cam.left = -radius;
      cam.right = radius;
      cam.top = radius;
      cam.bottom = -radius;
      cam.near = radius * 0.5;
      cam.far = radius * 3.5;
      cam.updateProjectionMatrix();
      this.sun = light;
      this.sunIntensity = sun.intensity;
      this.group.add(light, light.target);
    }
    this.applyAmbient();
  }

  setShadowsEnabled(enabled: boolean): void {
    this.shadowsEnabled = enabled;
    this.applyAmbient();
  }

  private applyAmbient(): void {
    const sunActive = this.sun !== null && this.shadowsEnabled;
    if (this.sun) this.sun.intensity = sunActive ? this.sunIntensity : 0;
    // Sin sol (por sombras desactivadas) se compensa con algo más de luz ambiental.
    const boost = this.sun && !sunActive ? 1.35 : 1;
    this.ambient.intensity = this.ambientIntensity * 0.55 * boost;
    this.hemisphere.intensity = this.ambientIntensity * 0.45 * boost;
  }

  setLamps(lamps: Lamp[]): void {
    this.lamps = lamps;
    this.lastAssign = -Infinity;
    for (const mesh of [this.fixtures, this.posts]) {
      if (!mesh) continue;
      this.group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.fixtures = null;
    this.posts = null;
    if (lamps.length === 0) return;
    // Todas las pantallas en una sola malla instanciada: un draw call.
    const fixtures = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.4, 0.1, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      lamps.length,
    );
    fixtures.name = 'lamp_fixtures';
    const matrix = new THREE.Matrix4();
    lamps.forEach((lamp, i) => {
      matrix.makeTranslation(lamp.position.x, lamp.position.y, lamp.position.z);
      fixtures.setMatrixAt(i, matrix);
      fixtures.setColorAt(i, this.fixtureHdr(lamp, 1));
    });
    this.fixtures = fixtures;
    this.group.add(fixtures);

    const withPost = lamps.filter((lamp) => lamp.post > 0);
    if (withPost.length > 0) {
      const posts = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.12, 1, 0.12).translate(0, 0.5, 0),
        new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.6, metalness: 0.4 }),
        withPost.length,
      );
      // Sin sombra: la luz de la farola está justo encima del poste y lo taparía todo.
      posts.name = 'lamp_posts';
      withPost.forEach((lamp, i) => {
        matrix.compose(
          new THREE.Vector3(lamp.position.x, lamp.position.y - lamp.post, lamp.position.z),
          new THREE.Quaternion(),
          new THREE.Vector3(1, lamp.post - 0.05, 1),
        );
        posts.setMatrixAt(i, matrix);
      });
      this.posts = posts;
      this.group.add(posts);
    }
  }

  /** Destello breve (fogonazo de un disparo, explosión). Reutiliza la luz más antigua. */
  flash(
    position: { x: number; y: number; z: number },
    color: number,
    intensity: number,
    radius: number,
    duration: number,
  ): void {
    const flash = this.flashes.reduce((oldest, f) => (f.start < oldest.start ? f : oldest));
    flash.light.position.set(position.x, position.y, position.z);
    flash.light.color.setHex(color);
    flash.light.distance = radius;
    flash.start = this.time;
    flash.duration = duration;
    flash.peak = intensity * CANDELA_PER_UNIT;
  }

  update(time: number, camera: THREE.Vector3): void {
    this.time = time;
    if (time - this.lastAssign >= REASSIGN_INTERVAL) {
      this.lastAssign = time;
      this.assignLamps(camera);
    }

    this.lampLights.forEach((light, slot) => {
      const index = this.assigned[slot];
      const lamp = index === null || index === undefined ? undefined : this.lamps[index];
      if (!lamp) {
        light.intensity = 0;
        return;
      }
      light.intensity =
        lamp.intensity * CANDELA_PER_UNIT * flickerFactor(lamp.flicker, time, lamp.seed);
    });

    if (this.fixtures) {
      let changed = false;
      this.lamps.forEach((lamp, i) => {
        if (lamp.flicker === 'steady') return;
        this.fixtures!.setColorAt(
          i,
          this.fixtureHdr(lamp, flickerFactor(lamp.flicker, time, lamp.seed)),
        );
        changed = true;
      });
      if (changed && this.fixtures.instanceColor) this.fixtures.instanceColor.needsUpdate = true;
    }

    for (const flash of this.flashes) {
      flash.light.intensity = flash.peak * flashFalloff(time - flash.start, flash.duration);
    }
  }

  dispose(): void {
    this.setLamps([]);
    this.sun?.dispose();
    for (const light of this.lampLights) light.dispose();
    for (const flash of this.flashes) flash.light.dispose();
  }

  private assignLamps(camera: THREE.Vector3): void {
    const { shadowed, plain } = selectLamps(
      this.lamps.map((lamp) => ({ ...lamp.position, radius: lamp.radius, shadows: lamp.shadows })),
      camera,
      this.options.lampSlots,
      this.options.shadowSlots,
    );
    const shadowSlots = this.options.shadowSlots;
    this.assigned.fill(null);
    shadowed.forEach((index, slot) => (this.assigned[slot] = index));
    // Las lámparas normales van primero a los huecos sin sombra; si sobran, ocupan los huecos
    // con sombra libres (cambiar castShadow obligaría a recompilar los shaders).
    const queue = [...plain];
    for (let slot = shadowSlots; slot < this.lampLights.length && queue.length > 0; slot++) {
      this.assigned[slot] = queue.shift()!;
    }
    for (let slot = 0; slot < shadowSlots && queue.length > 0; slot++) {
      if (this.assigned[slot] === null) this.assigned[slot] = queue.shift()!;
    }

    this.lampLights.forEach((light, slot) => {
      const index = this.assigned[slot];
      const lamp = index === null || index === undefined ? undefined : this.lamps[index];
      if (!lamp) return;
      light.position.set(lamp.position.x, lamp.position.y - LIGHT_DROP, lamp.position.z);
      light.color.setHex(lamp.color);
      light.distance = lamp.radius;
      if (light.castShadow && light.shadow.camera.far !== lamp.radius) {
        light.shadow.camera.far = lamp.radius;
        light.shadow.camera.updateProjectionMatrix();
      }
    });
  }

  /** Color de la pantalla por encima de 1 para que el bloom la haga brillar. */
  private fixtureHdr(lamp: Lamp, factor: number): THREE.Color {
    return this.fixtureColor.setHex(lamp.color).multiplyScalar(2 + 4 * lamp.intensity * factor);
  }
}
