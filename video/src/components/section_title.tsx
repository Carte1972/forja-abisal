import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS } from '../theme';

interface SectionTitleProps {
  text: string;
  /** Texto pequeño encima del título (por ejemplo, «NIVEL 1»). */
  kicker?: string;
  /** Línea de datos debajo. */
  detail?: string;
  start: number;
  align?: 'center' | 'left';
  size?: number;
}

/** Título de sección: letras de fundición con una barra de brasa que se extiende debajo. */
export function SectionTitle({
  text,
  kicker,
  detail,
  start,
  align = 'center',
  size = 132,
}: SectionTitleProps) {
  const frame = useCurrentFrame() - start;
  const appear = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bar = interpolate(frame, [6, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (frame < 0) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        alignSelf: align === 'center' ? 'center' : 'flex-start',
        width: 'fit-content',
        opacity: appear,
        transform: `translateY(${(1 - appear) * 20}px)`,
      }}
    >
      {kicker ? (
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 34,
            letterSpacing: '0.3em',
            color: COLORS.emberLight,
          }}
        >
          {kicker}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: FONTS.title,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: '0.05em',
          color: COLORS.text,
          textShadow: `0 0 26px rgba(255,106,31,0.45), 0 5px 0 #1a0802`,
        }}
      >
        {text}
      </div>
      <div
        style={{
          height: 8,
          width: `${bar * 100}%`,
          marginTop: 14,
          background: `linear-gradient(90deg, ${COLORS.emberDeep}, ${COLORS.ember}, ${COLORS.emberLight})`,
          boxShadow: `0 0 18px ${COLORS.ember}`,
        }}
      />
      {detail ? (
        <div
          style={{
            marginTop: 16,
            fontFamily: FONTS.body,
            fontWeight: 500,
            fontSize: 42,
            letterSpacing: '0.06em',
            color: COLORS.muted,
          }}
        >
          {detail}
        </div>
      ) : null}
    </div>
  );
}
