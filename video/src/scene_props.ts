import type { SceneTiming } from './timing';

export interface SceneProps {
  timing: SceneTiming;
}

/**
 * Fotograma (dentro de la escena) en el que va la narración al `fraction` de su duración.
 * Los textos y cortes se colocan así, en proporción a la frase que se está diciendo, y se
 * reajustan solos si cambia la voz.
 */
export function narrationAt(timing: SceneTiming, fraction: number): number {
  return Math.round(timing.narrationFrom + fraction * timing.narrationFrames);
}
