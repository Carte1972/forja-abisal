import * as THREE from 'three';

export interface SkyColors {
  top: number;
  horizon: number;
  bottom: number;
  clouds: number;
}

const vertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // Siempre en el plano lejano: detrás de cualquier geometría.
    gl_Position = clip.xyww;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  uniform vec3 bottomColor;
  uniform float cloudCover;
  uniform float time;
  varying vec3 vDirection;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 dir = normalize(vDirection);
    float h = dir.y;
    vec3 color = h > 0.0
      ? mix(horizonColor, topColor, pow(h, 0.55))
      : mix(horizonColor, bottomColor, pow(-h, 0.35));

    // Resplandor de brasas en el horizonte.
    color += horizonColor * 0.45 * exp(-abs(h) * 9.0);

    if (h > 0.0) {
      // Nubes proyectadas sobre un plano alto que se desplazan con el tiempo.
      vec2 uv = dir.xz / (h + 0.12) * 1.6 + vec2(time * 0.012, time * 0.005);
      float n = fbm(uv);
      float cloud = smoothstep(1.0 - cloudCover, 1.25 - cloudCover, n) * smoothstep(0.0, 0.2, h);
      vec3 cloudColor = mix(horizonColor * 1.3, topColor * 2.0 + 0.02, h);
      color = mix(color, cloudColor, cloud * 0.75);

      // Estrellas en las zonas despejadas y altas.
      vec2 cell = floor(dir.xz / (h + 0.3) * 180.0);
      float star = step(0.9975, hash(cell)) * smoothstep(0.25, 0.6, h) * (1.0 - cloud);
      color += vec3(star) * (0.6 + 0.4 * sin(time * 3.0 + hash(cell) * 40.0));
    }

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Cúpula de cielo procedural que sigue a la cámara. Solo se ve donde no hay techo. */
export class SkyDome {
  readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;

  constructor(colors: SkyColors) {
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        topColor: { value: new THREE.Color(colors.top) },
        horizonColor: { value: new THREE.Color(colors.horizon) },
        bottomColor: { value: new THREE.Color(colors.bottom) },
        cloudCover: { value: colors.clouds },
        time: { value: 0 },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), material);
    this.mesh.name = 'sky';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
  }

  update(time: number, camera: THREE.Camera): void {
    this.mesh.position.copy(camera.position);
    this.mesh.material.uniforms.time!.value = time;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
