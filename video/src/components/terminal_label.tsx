import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS } from '../theme';

interface TerminalLabelProps {
  text: string;
  /** Fotogramas en los que aparece y desaparece. */
  from: number;
  to: number;
  /** Caracteres por segundo al escribirse. */
  speed?: number;
}

/** Rótulo de terminal industrial: se escribe letra a letra, con cursor, y se apaga al final. */
export function TerminalLabel({ text, from, to, speed = 38 }: TerminalLabelProps) {
  const frame = useCurrentFrame();
  if (frame < from || frame > to + 10) return null;
  const typed = Math.min(text.length, Math.floor(((frame - from) / 60) * speed));
  const opacity = interpolate(frame, [to, to + 10], [1, 0], { extrapolateLeft: 'clamp' });
  const cursorOn = Math.floor(frame / 16) % 2 === 0 || typed < text.length;
  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        bottom: 110,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '16px 28px 16px 22px',
        background: 'rgba(8,5,4,0.78)',
        borderLeft: `6px solid ${COLORS.ember}`,
        fontFamily: FONTS.mono,
        fontWeight: 500,
        fontSize: 38,
        letterSpacing: '0.04em',
        color: COLORS.text,
        opacity,
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          background: COLORS.ember,
          boxShadow: `0 0 12px ${COLORS.ember}`,
        }}
      />
      <span>
        {text.slice(0, typed)}
        <span style={{ color: COLORS.ember, opacity: cursorOn ? 1 : 0 }}>▌</span>
      </span>
    </div>
  );
}
