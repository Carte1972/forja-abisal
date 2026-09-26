import type { ReactNode } from 'react';
import { Sequence } from 'remotion';
import { fitRate } from '../clips';
import { FPS } from '../theme';
import { Clip } from './clip';
import { Fade, Vignette } from './overlays';

interface ShotProps {
  clip: string;
  /** Fotogramas (dentro de la escena) donde empieza y termina el plano. */
  from: number;
  to: number;
  /** Segundos del clip que se saltan. */
  start?: number;
  fadeIn?: number;
  fadeOut?: number;
  zoom?: readonly [number, number];
  /** Lo que va encima del clip (rótulos, fichas…), con el mismo tiempo que el plano. */
  children?: ReactNode;
}

/**
 * Un plano: un clip del juego entre dos fotogramas, con viñeta y fundidos cortos a negro.
 * Si al clip le falta metraje para el hueco, se ralentiza un poco en lugar de congelarse.
 */
export function Shot({
  clip,
  from,
  to,
  start = 0,
  fadeIn = 8,
  fadeOut = 8,
  zoom,
  children,
}: ShotProps) {
  const frames = Math.max(1, to - from);
  return (
    <Sequence from={from} durationInFrames={frames} name={clip}>
      <Fade duration={frames} fadeIn={fadeIn} fadeOut={fadeOut}>
        <Clip
          name={clip}
          from={start}
          rate={fitRate(clip, start, frames, FPS)}
          zoom={zoom}
          duration={frames}
        />
        <Vignette />
        {children}
      </Fade>
    </Sequence>
  );
}
