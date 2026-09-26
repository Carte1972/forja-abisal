import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { Clip } from '../components/clip';
import { ForgeTitle } from '../components/forge_title';
import { Darken, Fade, Vignette } from '../components/overlays';
import { Subtitles } from '../components/subtitles';
import { narrationAt, type SceneProps } from '../scene_props';
import { toFrames, type SceneTiming } from '../timing';
import { COLORS, FONTS } from '../theme';

/** Fotograma del último plano (el rastrero), justo antes de que acabe la narración. */
export function closingCutFrame(timing: SceneTiming): number {
  return timing.narrationFrom + timing.narrationFrames - toFrames(1.25);
}

/** Duración del último plano: el clip del rastrero entero. */
export const CLOSING_SHOT_FRAMES = toFrames(1.4);

/**
 * Escena 7: el título vuelve a encenderse sobre el lago de lava, con los enlaces. Con «buena
 * suerte, técnico» la imagen se oscurece y, con «en tu estado actual», el rastrero se lanza
 * contra la cámara. Corte a negro.
 */
export function ClosingScene({ timing }: SceneProps) {
  const at = (fraction: number) => narrationAt(timing, fraction);
  const cut = closingCutFrame(timing);
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <Sequence durationInFrames={cut} name="lago y título">
        <Fade duration={cut} fadeIn={16} fadeOut={0}>
          <Clip name="cierre_lago" />
          <Vignette strength={0.85} />
          <Dim from={at(0.41)} to={at(0.6)} />
          <Texts taglineAt={at(0.19)} linksAt={at(0.3)} outAt={cut - 24} />
        </Fade>
      </Sequence>
      <Sequence from={cut} durationInFrames={CLOSING_SHOT_FRAMES} name="rastrero">
        <Clip name="cierre_rastrero" />
        <Vignette strength={0.9} />
      </Sequence>
      <Subtitles captions={timing.captions} offset={timing.narrationFrom} />
    </AbsoluteFill>
  );
}

function Dim({ from, to }: { from: number; to: number }) {
  const frame = useCurrentFrame();
  return (
    <Darken
      opacity={interpolate(frame, [from, to], [0, 0.7], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })}
    />
  );
}

function Texts({
  taglineAt,
  linksAt,
  outAt,
}: {
  taglineAt: number;
  linksAt: number;
  outAt: number;
}) {
  const frame = useCurrentFrame();
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
  const tagline = interpolate(frame, [taglineAt, taglineAt + 16], [0, 1], clamp);
  const links = interpolate(frame, [linksAt, linksAt + 16], [0, 1], clamp);
  const out = interpolate(frame, [outAt, outAt + 20], [1, 0], clamp);
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        gap: 30,
        opacity: out,
        background:
          'radial-gradient(ellipse 60% 55% at center, rgba(8,5,4,0.88) 0%, rgba(8,5,4,0.6) 55%, transparent 100%)',
      }}
    >
      <ForgeTitle start={10} size={180} />
      <div
        style={{
          fontFamily: FONTS.body,
          fontWeight: 700,
          fontSize: 56,
          letterSpacing: '0.12em',
          color: COLORS.text,
          opacity: tagline,
        }}
      >
        DESCIENDE. ABRE PASO. SAL CON VIDA.
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          marginTop: 30,
          fontFamily: FONTS.mono,
          fontSize: 36,
          color: COLORS.emberLight,
          opacity: links,
        }}
      >
        <span>Juega gratis en el navegador: carte1972.github.io/forja-abisal</span>
        <span>Código fuente: github.com/Carte1972/forja-abisal</span>
        <span style={{ marginTop: 18, fontFamily: FONTS.body, fontSize: 32, color: COLORS.muted }}>
          Todo el contenido es original y se genera por código.
        </span>
      </div>
    </AbsoluteFill>
  );
}
