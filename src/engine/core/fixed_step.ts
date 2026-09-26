export interface FixedStepResult {
  /** Pasos de simulación que hay que ejecutar este frame. */
  steps: number;
  /** Fracción del siguiente paso ya transcurrida, para interpolar el render (0..1). */
  alpha: number;
}

/**
 * Acumulador de paso fijo: convierte tiempos de frame variables en un número entero
 * de pasos de simulación, limitando los frames largos para evitar la "espiral de la muerte".
 */
export class FixedStepAccumulator {
  private accumulator = 0;

  constructor(
    readonly step: number,
    private readonly maxFrameTime = 0.25,
    private readonly maxSteps = 8,
  ) {}

  advance(frameTime: number): FixedStepResult {
    this.accumulator += Math.min(Math.max(frameTime, 0), this.maxFrameTime);
    let steps = 0;
    while (this.accumulator >= this.step && steps < this.maxSteps) {
      this.accumulator -= this.step;
      steps++;
    }
    // Si seguimos por detrás tras el máximo de pasos, descartamos el tiempo sobrante.
    if (this.accumulator >= this.step) {
      this.accumulator %= this.step;
    }
    return { steps, alpha: this.accumulator / this.step };
  }

  reset(): void {
    this.accumulator = 0;
  }
}
