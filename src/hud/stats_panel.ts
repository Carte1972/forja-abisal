import type { RenderStats } from '../engine/render/renderer';

const UPDATE_INTERVAL = 0.25;

/** Panel de rendimiento (F3): FPS, tiempo de frame, draw calls y triángulos. */
export class StatsPanel {
  private readonly element: HTMLDivElement;
  private visible = false;
  private elapsed = 0;
  private frames = 0;
  private worstFrame = 0;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'stats-panel';
    this.element.hidden = true;
    parent.appendChild(this.element);
  }

  setVisible(visible: boolean): void {
    if (visible !== this.visible) this.toggle();
  }

  toggle(): void {
    this.visible = !this.visible;
    this.element.hidden = !this.visible;
    this.elapsed = 0;
    this.frames = 0;
    this.worstFrame = 0;
  }

  update(frameDt: number, stats: RenderStats, extra: Record<string, string | number> = {}): void {
    if (!this.visible) return;
    this.elapsed += frameDt;
    this.frames++;
    this.worstFrame = Math.max(this.worstFrame, frameDt);
    if (this.elapsed < UPDATE_INTERVAL) return;
    const fps = this.frames / this.elapsed;
    const lines = [
      `FPS ${fps.toFixed(0)}`,
      `frame ${((this.elapsed / this.frames) * 1000).toFixed(1)} ms (peor ${(this.worstFrame * 1000).toFixed(1)})`,
      `draw calls ${stats.drawCalls}`,
      `triángulos ${stats.triangles.toLocaleString('es-ES')}`,
      ...Object.entries(extra).map(([key, value]) => `${key} ${value}`),
    ];
    this.element.textContent = lines.join('\n');
    this.elapsed = 0;
    this.frames = 0;
    this.worstFrame = 0;
  }

  dispose(): void {
    this.element.remove();
  }
}
