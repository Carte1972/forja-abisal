import type { Caption } from '@remotion/captions';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../theme';

/**
 * Subtítulos de una escena (preparado para el trabajo de la voz real): si existe
 * public/subtitulos/<escena>.srt, se muestran sincronizados con la narración. Sin archivo, nada.
 */
export function Subtitles({ captions, offset }: { captions: readonly Caption[]; offset: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = ((frame - offset) / fps) * 1000;
  const current = captions.find((caption) => ms >= caption.startMs && ms < caption.endMs);
  if (!current) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 48,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: FONTS.body,
          fontWeight: 700,
          fontSize: 46,
          color: COLORS.text,
          background: 'rgba(0,0,0,0.65)',
          padding: '6px 20px',
        }}
      >
        {current.text.trim()}
      </span>
    </div>
  );
}
