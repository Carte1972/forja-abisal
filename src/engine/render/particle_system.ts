import * as THREE from 'three';
import type { Rng } from '../core/rng';

type V3 = { x: number; y: number; z: number };

export interface ParticleSpawn {
  position: V3;
  velocity: V3;
  life: number;
  size: [number, number];
  /** Colores inicial y final (pueden superar 1 para que brillen con el bloom). */
  color: [THREE.Color, THREE.Color];
  alpha: [number, number];
  /** Aceleración vertical (negativa = cae). */
  gravity: number;
  /** Frenado por segundo (0 = ninguno). */
  drag: number;
}

const vertexShader = /* glsl */ `
  attribute float size;
  attribute vec4 tint;
  uniform float pointScale;
  varying vec4 vTint;
  #include <fog_pars_vertex>
  void main() {
    vTint = tint;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * pointScale / max(-mvPosition.z, 0.05);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  varying vec4 vTint;
  #include <fog_pars_fragment>
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.15, d) * vTint.a;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vTint.rgb, alpha);
    #include <fog_fragment>
  }
`;

/** Conjunto de partículas con un número máximo fijo; las nuevas reemplazan a las más antiguas. */
class ParticlePool {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly positions: Float32Array;
  private readonly tints: Float32Array;
  private readonly sizes: Float32Array;
  private readonly velocity: Float32Array;
  private readonly age: Float32Array;
  private readonly life: Float32Array;
  private readonly params: Float32Array;
  private readonly colors: Float32Array;
  private next = 0;
  private alive = 0;

  constructor(
    private readonly capacity: number,
    blending: THREE.Blending,
  ) {
    this.positions = new Float32Array(capacity * 3);
    this.tints = new Float32Array(capacity * 4);
    this.sizes = new Float32Array(capacity);
    this.velocity = new Float32Array(capacity * 3);
    this.age = new Float32Array(capacity).fill(1);
    this.life = new Float32Array(capacity).fill(1);
    // tamaño inicial, tamaño final, alfa inicial, alfa final, gravedad, frenado
    this.params = new Float32Array(capacity * 6);
    // color inicial y final (RGB)
    this.colors = new Float32Array(capacity * 6);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute(
      'tint',
      new THREE.BufferAttribute(this.tints, 4).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute(
      'size',
      new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage),
    );
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { pointScale: { value: 500 } }]),
      transparent: true,
      depthWrite: false,
      blending,
      fog: true,
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
  }

  spawn(p: ParticleSpawn): void {
    const i = this.next;
    this.next = (this.next + 1) % this.capacity;
    this.positions.set([p.position.x, p.position.y, p.position.z], i * 3);
    this.velocity.set([p.velocity.x, p.velocity.y, p.velocity.z], i * 3);
    this.age[i] = 0;
    this.life[i] = p.life;
    this.params.set([p.size[0], p.size[1], p.alpha[0], p.alpha[1], p.gravity, p.drag], i * 6);
    this.colors.set(
      [p.color[0].r, p.color[0].g, p.color[0].b, p.color[1].r, p.color[1].g, p.color[1].b],
      i * 6,
    );
  }

  update(dt: number, pointScale: number): void {
    this.points.material.uniforms.pointScale!.value = pointScale;
    let alive = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (this.age[i]! >= this.life[i]!) {
        if (this.sizes[i] !== 0) {
          this.sizes[i] = 0;
          this.tints[i * 4 + 3] = 0;
        }
        continue;
      }
      alive++;
      this.age[i]! += dt;
      const t = Math.min(this.age[i]! / this.life[i]!, 1);
      const p = i * 6;
      const drag = Math.max(0, 1 - this.params[p + 5]! * dt);
      const v = i * 3;
      this.velocity[v]! *= drag;
      this.velocity[v + 1] = this.velocity[v + 1]! * drag + this.params[p + 4]! * dt;
      this.velocity[v + 2]! *= drag;
      this.positions[v]! += this.velocity[v]! * dt;
      this.positions[v + 1]! += this.velocity[v + 1]! * dt;
      this.positions[v + 2]! += this.velocity[v + 2]! * dt;
      this.sizes[i] = this.params[p]! + (this.params[p + 1]! - this.params[p]!) * t;
      const c = i * 6;
      const tint = i * 4;
      this.tints[tint] = this.colors[c]! + (this.colors[c + 3]! - this.colors[c]!) * t;
      this.tints[tint + 1] = this.colors[c + 1]! + (this.colors[c + 4]! - this.colors[c + 1]!) * t;
      this.tints[tint + 2] = this.colors[c + 2]! + (this.colors[c + 5]! - this.colors[c + 2]!) * t;
      this.tints[tint + 3] = this.params[p + 2]! + (this.params[p + 3]! - this.params[p + 2]!) * t;
    }
    if (alive > 0 || this.alive > 0) {
      const { attributes } = this.points.geometry;
      attributes.position!.needsUpdate = true;
      attributes.tint!.needsUpdate = true;
      attributes.size!.needsUpdate = true;
    }
    this.alive = alive;
  }

  get activeCount(): number {
    return this.alive;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}

const color = (hex: number, intensity = 1) => new THREE.Color(hex).multiplyScalar(intensity);

/**
 * Partículas del juego en dos draw calls: aditivas (chispas, fuego) y con transparencia
 * normal (humo, polvo, sangre). Incluye efectos ya preparados.
 */
export class ParticleSystem {
  readonly group = new THREE.Group();
  private readonly glow = new ParticlePool(1500, THREE.AdditiveBlending);
  private readonly soft = new ParticlePool(1500, THREE.NormalBlending);

  constructor(private readonly rng: Rng) {
    this.group.name = 'particles';
    this.soft.points.renderOrder = 1;
    this.glow.points.renderOrder = 2;
    this.group.add(this.soft.points, this.glow.points);
  }

  get activeCount(): number {
    return this.glow.activeCount + this.soft.activeCount;
  }

  /** `pointScale` convierte tamaño en metros a píxeles: alto del búfer / (2·tan(fov/2)). */
  update(dt: number, camera: THREE.PerspectiveCamera, bufferHeight: number): void {
    const scale = bufferHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    this.glow.update(dt, scale);
    this.soft.update(dt, scale);
  }

  /** Chispas de un impacto de bala contra una superficie. */
  sparks(position: V3, normal: V3, count = 10): void {
    for (let i = 0; i < count; i++) {
      const dir = this.hemisphere(normal, 0.8);
      const speed = this.rng.range(3, 9);
      this.glow.spawn({
        position,
        velocity: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
        life: this.rng.range(0.15, 0.4),
        size: [0.05, 0.01],
        color: [color(0xffd890, 4), color(0xff5a10, 1.5)],
        alpha: [1, 0],
        gravity: -14,
        drag: 2,
      });
    }
    this.dust(position, normal, 4);
  }

  /** Polvo o esquirlas grises (golpes cuerpo a cuerpo y parte de los impactos). */
  dust(position: V3, normal: V3, count = 8): void {
    for (let i = 0; i < count; i++) {
      const dir = this.hemisphere(normal, 1);
      const speed = this.rng.range(0.4, 1.6);
      this.soft.spawn({
        position,
        velocity: { x: dir.x * speed, y: dir.y * speed + 0.3, z: dir.z * speed },
        life: this.rng.range(0.4, 0.9),
        size: [0.08, 0.3],
        color: [color(0x8a8078), color(0x4a4440)],
        alpha: [0.55, 0],
        gravity: -1,
        drag: 3,
      });
    }
  }

  /** Salpicadura de un color no realista (verde, azul...) en la dirección del disparo. */
  blood(position: V3, direction: V3, hex: number, count = 14): void {
    for (let i = 0; i < count; i++) {
      const spread = this.randomUnit();
      const speed = this.rng.range(1.5, 5);
      this.soft.spawn({
        position,
        velocity: {
          x: (direction.x + spread.x * 0.6) * speed,
          y: (direction.y + spread.y * 0.6) * speed + 1.5,
          z: (direction.z + spread.z * 0.6) * speed,
        },
        life: this.rng.range(0.35, 0.8),
        size: [this.rng.range(0.06, 0.12), 0.03],
        color: [color(hex, 1.3), color(hex, 0.5)],
        alpha: [0.95, 0.2],
        gravity: -12,
        drag: 1,
      });
    }
  }

  /** Bocanada de humo (disparos, estelas de proyectiles). */
  smoke(position: V3, amount = 1, size = 0.25): void {
    for (let i = 0; i < amount; i++) {
      const jitter = this.randomUnit();
      this.soft.spawn({
        position: {
          x: position.x + jitter.x * 0.05,
          y: position.y + jitter.y * 0.05,
          z: position.z + jitter.z * 0.05,
        },
        velocity: { x: jitter.x * 0.3, y: 0.4 + this.rng.range(0, 0.4), z: jitter.z * 0.3 },
        life: this.rng.range(0.6, 1.4),
        size: [size, size * 3.5],
        color: [color(0x6a625c), color(0x2a2624)],
        alpha: [0.35, 0],
        gravity: 0.3,
        drag: 1.5,
      });
    }
  }

  /** Brasa brillante (estela de la carga explosiva). */
  ember(position: V3): void {
    const jitter = this.randomUnit();
    this.glow.spawn({
      position,
      velocity: { x: jitter.x * 0.6, y: jitter.y * 0.6, z: jitter.z * 0.6 },
      life: this.rng.range(0.15, 0.3),
      size: [0.14, 0.02],
      color: [color(0xffb050, 5), color(0xff3010, 1)],
      alpha: [1, 0],
      gravity: 0,
      drag: 2,
    });
  }

  /** Explosión: bola de fuego, chispas, humo que sube y restos que caen. */
  explosion(position: V3, radius: number): void {
    // Núcleo cegador y bola de fuego que se expande y se apaga.
    this.glow.spawn({
      position,
      velocity: { x: 0, y: 0, z: 0 },
      life: 0.18,
      size: [radius * 2.2, radius * 3],
      color: [color(0xfff0d0, 8), color(0xff8030, 2)],
      alpha: [1, 0],
      gravity: 0,
      drag: 0,
    });
    for (let i = 0; i < 45; i++) {
      const dir = this.randomUnit();
      const speed = this.rng.range(1, 3.5) * radius;
      this.glow.spawn({
        position,
        velocity: { x: dir.x * speed, y: dir.y * speed + 1, z: dir.z * speed },
        life: this.rng.range(0.35, 0.8),
        size: [radius * 0.8, radius * 0.25],
        color: [color(0xffe0a0, 6), color(0xff3a08, 1.2)],
        alpha: [1, 0],
        gravity: 2,
        drag: 4,
      });
    }
    for (let i = 0; i < 30; i++) {
      const dir = this.randomUnit();
      const speed = this.rng.range(6, 14);
      this.glow.spawn({
        position,
        velocity: { x: dir.x * speed, y: Math.abs(dir.y) * speed, z: dir.z * speed },
        life: this.rng.range(0.4, 0.9),
        size: [0.06, 0.02],
        color: [color(0xffd070, 5), color(0xff4010, 1)],
        alpha: [1, 0],
        gravity: -16,
        drag: 1,
      });
    }
    for (let i = 0; i < 18; i++) {
      const dir = this.randomUnit();
      this.soft.spawn({
        position: {
          x: position.x + dir.x * radius * 0.3,
          y: position.y + dir.y * radius * 0.3,
          z: position.z + dir.z * radius * 0.3,
        },
        velocity: { x: dir.x * 1.2, y: 1 + this.rng.range(0, 1.5), z: dir.z * 1.2 },
        life: this.rng.range(1.2, 2.4),
        size: [radius * 0.3, radius * 0.9],
        color: [color(0x4a4038), color(0x1e1a18)],
        alpha: [0.6, 0],
        gravity: 0.4,
        drag: 1.2,
      });
    }
  }

  dispose(): void {
    this.glow.dispose();
    this.soft.dispose();
  }

  private randomUnit(): V3 {
    const z = this.rng.range(-1, 1);
    const angle = this.rng.range(0, Math.PI * 2);
    const r = Math.sqrt(1 - z * z);
    return { x: r * Math.cos(angle), y: z, z: r * Math.sin(angle) };
  }

  /** Dirección aleatoria en el hemisferio de `normal`, más o menos abierta según `openness`. */
  private hemisphere(normal: V3, openness: number): V3 {
    const r = this.randomUnit();
    const x = normal.x + r.x * openness;
    const y = normal.y + r.y * openness;
    const z = normal.z + r.z * openness;
    const length = Math.hypot(x, y, z) || 1;
    return { x: x / length, y: y / length, z: z / length };
  }
}
