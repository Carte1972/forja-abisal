import { AbsoluteFill, Freeze, Sequence } from 'remotion';
import { Clip } from '../components/clip';
import { ForgeTitle } from '../components/forge_title';
import { Fade, FoundryFlash, Vignette } from '../components/overlays';
import { Subtitles } from '../components/subtitles';
import type { SceneProps } from '../scene_props';
import { toFrames } from '../timing';
import { COLORS } from '../theme';

/** Fotograma en el que termina el salto y se enciende el título. */
export const HOOK_TITLE_FRAME = toFrames(5);

/** Escena 1: el salto con carga sobre el lago de lava y el título del juego. */
export function HookScene({ timing }: SceneProps) {
  const duration = timing.durationInFrames;
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <Fade duration={duration} fadeIn={20} fadeOut={24}>
        <Sequence durationInFrames={HOOK_TITLE_FRAME} name="salto con carga">
          <Clip name="gancho_salto_carga" />
          <Vignette />
        </Sequence>
        <Sequence from={HOOK_TITLE_FRAME} name="título">
          <Freeze frame={HOOK_TITLE_FRAME - 1}>
            <AbsoluteFill style={{ filter: 'blur(8px) brightness(0.35) saturate(1.2)' }}>
              <Clip name="gancho_salto_carga" />
            </AbsoluteFill>
          </Freeze>
          <Vignette strength={0.9} />
          <AbsoluteFill style={{ justifyContent: 'center' }}>
            <ForgeTitle start={4} />
          </AbsoluteFill>
        </Sequence>
        <FoundryFlash at={HOOK_TITLE_FRAME - 6} length={30} />
      </Fade>
      <Subtitles captions={timing.captions} offset={timing.narrationFrom} />
    </AbsoluteFill>
  );
}
