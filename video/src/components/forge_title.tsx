import { interpolate, interpolateColors, useCurrentFrame } from 'remotion';
import { COLORS, FONTS } from '../theme';

interface ForgeTitleProps {
  /** Fotograma en el que empieza a encenderse. */
  start: number;
  size?: number;
  text?: string;
}

/**
 * Título del juego que se enciende letra a letra como metal al rojo: del gris del metal frío al
 * blanco incandescente y, al enfriarse un poco, al naranja de brasa.
 */
export function ForgeTitle({ start, size = 210, text = 'FORJA ABISAL' }: ForgeTitleProps) {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        fontFamily: FONTS.title,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: '0.08em',
        lineHeight: 1,
        display: 'flex',
        justifyContent: 'center',
        whiteSpace: 'pre',
      }}
    >
      {[...text].map((char, i) => {
        const local = frame - start - i * 3;
        const heat = interpolate(local, [0, 10, 40], [0, 1, 0.55], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const color = interpolateColors(
          heat,
          [0, 0.55, 1],
          [COLORS.metal, COLORS.ember, COLORS.whiteHot],
        );
        // Brillo que respira muy despacio una vez encendido (determinista, sin azar).
        const breathe = local > 40 ? 0.85 + 0.15 * Math.sin((local - 40) / 18 + i) : 1;
        const glow = heat * 40 * breathe;
        const rise = interpolate(local, [0, 14], [18, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <span
            key={i}
            style={{
              color,
              opacity: local < 0 ? 0 : 1,
              transform: `translateY(${rise}px)`,
              textShadow: `0 0 ${glow}px ${COLORS.ember}, 0 0 ${glow * 2.2}px ${COLORS.emberDeep}, 0 6px 0 #2a0c02`,
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
}
