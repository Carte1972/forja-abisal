import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { COLORS } from '../theme';

/** Oscurece los bordes, como el post-procesado del juego. */
export function Vignette({ strength = 0.75 }: { strength?: number }) {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, transparent 45%, rgba(5,3,2,${strength}) 100%)`,
        pointerEvents: 'none',
      }}
    />
  );
}

/** Fundido desde negro al principio y a negro al final de una secuencia de `duration` fotogramas. */
export function Fade({
  duration,
  fadeIn = 12,
  fadeOut = 12,
  children,
}: {
  duration: number;
  fadeIn?: number;
  fadeOut?: number;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  const opacity = Math.min(
    fadeIn > 0 ? interpolate(frame, [0, fadeIn], [0, 1], { extrapolateRight: 'clamp' }) : 1,
    fadeOut > 0
      ? interpolate(frame, [duration - fadeOut, duration], [1, 0], { extrapolateLeft: 'clamp' })
      : 1,
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

/** Destello de fundición: un fogonazo naranja que se apaga en `length` fotogramas. */
export function FoundryFlash({ at, length = 24 }: { at: number; length?: number }) {
  const frame = useCurrentFrame();
  const t = (frame - at) / length;
  if (t < 0 || t > 1) return null;
  const intensity = t < 0.12 ? t / 0.12 : Math.pow(1 - (t - 0.12) / 0.88, 2);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, ${COLORS.whiteHot} 0%, ${COLORS.ember} 35%, ${COLORS.emberDeep} 70%, transparent 100%)`,
        opacity: intensity * 0.9,
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }}
    />
  );
}

/** Capa negra con la opacidad indicada (oscurecer la imagen detrás de un texto). */
export function Darken({ opacity }: { opacity: number }) {
  return <AbsoluteFill style={{ background: COLORS.background, opacity }} />;
}
