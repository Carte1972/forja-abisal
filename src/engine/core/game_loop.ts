import { FixedStepAccumulator } from './fixed_step';

export interface GameLoopCallbacks {
  /** Simulación a paso fijo (física y lógica). */
  fixedUpdate(dt: number): void;
  /** Render en cada frame; `alpha` sirve para interpolar entre los dos últimos pasos. */
  render(alpha: number, frameDt: number): void;
}

export class GameLoop {
  private readonly stepper: FixedStepAccumulator;
  private rafId = 0;
  private lastTime = 0;
  private running = false;

  constructor(
    private readonly callbacks: GameLoopCallbacks,
    readonly step = 1 / 60,
  ) {
    this.stepper = new FixedStepAccumulator(step);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.stepper.reset();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return;
    const frameDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const { steps, alpha } = this.stepper.advance(frameDt);
    for (let i = 0; i < steps; i++) {
      this.callbacks.fixedUpdate(this.step);
    }
    this.callbacks.render(alpha, frameDt);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
