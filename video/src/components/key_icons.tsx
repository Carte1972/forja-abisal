import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS } from '../theme';

const KEYS = [COLORS.keyRed, COLORS.keyBlue, COLORS.keyYellow] as const;

/** Las tres llaves (roja, azul y amarilla), que aparecen de una en una con un pequeño rebote. */
export function KeyIcons({
  start,
  size = 120,
  gap = 12,
}: {
  start: number;
  size?: number;
  gap?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: 'flex', gap: size * 0.4 }}>
      {KEYS.map((color, i) => {
        const pop = spring({
          frame: frame - start - i * gap,
          fps,
          config: { damping: 11, stiffness: 160 },
        });
        return (
          <svg
            key={color}
            width={size}
            height={size}
            viewBox="0 0 64 64"
            style={{
              transform: `scale(${pop})`,
              filter: `drop-shadow(0 0 ${size / 6}px ${color})`,
            }}
          >
            <circle cx="22" cy="32" r="14" fill="none" stroke={color} strokeWidth="7" />
            <path
              d="M35 32 H60 M50 32 V42 M58 32 V40"
              stroke={color}
              strokeWidth="7"
              strokeLinecap="square"
            />
          </svg>
        );
      })}
    </div>
  );
}
