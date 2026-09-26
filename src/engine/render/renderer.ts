import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  PixelationEffect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
  type Effect,
} from 'postprocessing';
import * as THREE from 'three';

export interface RenderQuality {
  /** Sin post-procesado se renderiza directo a pantalla con tone mapping de Three.js. */
  postProcessing: boolean;
  bloom: boolean;
  vignette: boolean;
  /** Filtro retro de píxeles grandes. */
  pixelate: boolean;
  shadows: boolean;
  /** Escala de resolución (0.5 = la mitad de píxeles por lado). */
  resolutionScale: number;
}

export const DEFAULT_QUALITY: RenderQuality = {
  postProcessing: true,
  bloom: true,
  vignette: true,
  pixelate: false,
  shadows: true,
  resolutionScale: 1,
};

export interface RenderStats {
  drawCalls: number;
  triangles: number;
}

/**
 * WebGLRenderer + escena + cámara principal + cadena de post-procesado
 * (bloom para emisivos, viñeta, tone mapping y pixelado opcional).
 */
export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  /**
   * Capa del arma en primera persona: escena y cámara propias que se dibujan después del mundo
   * borrando solo la profundidad, así el arma nunca atraviesa las paredes.
   */
  readonly viewmodelScene = new THREE.Scene();
  readonly viewmodelCamera = new THREE.PerspectiveCamera(62, 1, 0.01, 10);
  private readonly composer: EffectComposer;
  private readonly bloom = new BloomEffect({
    luminanceThreshold: 0.95,
    luminanceSmoothing: 0.2,
    intensity: 1.1,
    mipmapBlur: true,
    radius: 0.7,
  });
  private readonly vignette = new VignetteEffect({ offset: 0.3, darkness: 0.62 });
  private readonly toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  private readonly pixelation = new PixelationEffect(5);
  private effectPasses: EffectPass[] = [];
  private quality: RenderQuality = { ...DEFAULT_QUALITY };
  private readonly resizeObserver: ResizeObserver;
  private readonly size = new THREE.Vector2(1, 1);
  private readonly drawingSize = new THREE.Vector2(1, 1);

  constructor(private readonly container: HTMLElement) {
    // Sin MSAA en el canvas: el antialiasing lo hace el composer sobre sus propios buffers.
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.domElement.classList.add('game-canvas');
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = false;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(75, 1, 0.05, 500);
    this.camera.rotation.order = 'YXZ';

    this.composer = new EffectComposer(this.renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: 4,
    });
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const viewmodelPass = new RenderPass(this.viewmodelScene, this.viewmodelCamera);
    viewmodelPass.clearPass.color = false;
    viewmodelPass.clearPass.depth = true;
    viewmodelPass.ignoreBackground = true;
    viewmodelPass.skipShadowMapUpdate = true;
    this.composer.addPass(viewmodelPass);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.setQuality(this.quality);
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /** Alto del búfer de dibujo en píxeles (para el tamaño de las partículas). */
  get bufferHeight(): number {
    return this.renderer.getDrawingBufferSize(this.drawingSize).y;
  }

  get maxAnisotropy(): number {
    return this.renderer.capabilities.getMaxAnisotropy();
  }

  setQuality(quality: RenderQuality): void {
    this.quality = { ...quality };
    this.renderer.shadowMap.enabled = quality.shadows;
    // Con post-procesado el tone mapping lo aplica el último pase; sin él, Three.js.
    this.renderer.toneMapping = quality.postProcessing
      ? THREE.NoToneMapping
      : THREE.ACESFilmicToneMapping;

    for (const pass of this.effectPasses) {
      this.composer.removePass(pass);
      pass.dispose();
    }
    const effects: Effect[] = [];
    if (quality.bloom) effects.push(this.bloom);
    if (quality.vignette) effects.push(this.vignette);
    effects.push(this.toneMapping);
    this.effectPasses = [new EffectPass(this.camera, ...effects)];
    // El pixelado va después del tone mapping, sobre la imagen final.
    if (quality.pixelate) this.effectPasses.push(new EffectPass(this.camera, this.pixelation));
    for (const pass of this.effectPasses) this.composer.addPass(pass);
    this.composer.multisampling = quality.pixelate ? 0 : 4;
    this.resize();
  }

  render(frameDt: number): void {
    this.renderer.info.reset();
    if (this.quality.postProcessing) {
      this.composer.render(frameDt);
      return;
    }
    this.renderer.autoClear = false;
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.viewmodelScene, this.viewmodelCamera);
    this.renderer.autoClear = true;
  }

  stats(): RenderStats {
    const { render } = this.renderer.info;
    return { drawCalls: render.calls, triangles: render.triangles };
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
      }
    });
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private resize(): void {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.size.set(width, height);
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2) * this.quality.resolutionScale,
    );
    this.composer.setSize(width, height, false);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.viewmodelCamera.aspect = width / height;
    this.viewmodelCamera.updateProjectionMatrix();
  }
}
