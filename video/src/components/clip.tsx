import type { CSSProperties } from 'react';
import { AbsoluteFill, interpolate, OffthreadVideo, staticFile, useCurrentFrame } from 'remotion';
import { FPS } from '../theme';

interface ClipProps {
  /** Nombre del clip grabado por el juego (public/clips/<name>.mp4). */
  name: string;
  /** Segundos del clip que se saltan al empezar. */
  from?: number;
  /** Velocidad de reproducción (menos de 1 alarga el clip). */
  rate?: number;
  /** Acercamiento lento: escala al principio y al final de la secuencia. */
  zoom?: readonly [number, number];
  /** Duración de la secuencia en fotogramas (para el acercamiento). */
  duration?: number;
  style?: CSSProperties;
}

/** Un clip del juego a pantalla completa (o en el hueco que le dé su contenedor). */
export function Clip({ name, from = 0, rate = 1, zoom, duration = 1, style }: ClipProps) {
  const frame = useCurrentFrame();
  const scale = zoom ? interpolate(frame, [0, duration], zoom, { extrapolateRight: 'clamp' }) : 1;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', ...style }}>
      <OffthreadVideo
        src={staticFile(`clips/${name}.mp4`)}
        muted
        trimBefore={Math.round(from * FPS)}
        playbackRate={rate}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})` }}
      />
    </AbsoluteFill>
  );
}
