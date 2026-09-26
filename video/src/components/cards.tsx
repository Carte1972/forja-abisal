import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS } from '../theme';

function useSlideIn(start: number): { opacity: number; offset: number } {
  const frame = useCurrentFrame();
  const t = interpolate(frame - start, [0, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return { opacity: t, offset: (1 - t) * -80 };
}

interface WeaponCardProps {
  slot: number;
  name: string;
  primary: string;
  alt: string;
  start: number;
}

/** Ficha de arma: tecla, nombre y sus dos disparos. */
export function WeaponCard({ slot, name, primary, alt, start }: WeaponCardProps) {
  const { opacity, offset } = useSlideIn(start);
  return (
    <div style={{ opacity, transform: `translateX(${offset}px)`, width: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div
          style={{
            width: 96,
            height: 96,
            display: 'grid',
            placeItems: 'center',
            fontFamily: FONTS.title,
            fontWeight: 900,
            fontSize: 72,
            color: COLORS.background,
            background: `linear-gradient(180deg, ${COLORS.emberLight}, ${COLORS.ember})`,
            boxShadow: `0 0 26px rgba(255,106,31,0.6)`,
          }}
        >
          {slot}
        </div>
        <div
          style={{
            fontFamily: FONTS.title,
            fontWeight: 900,
            fontSize: 76,
            lineHeight: 0.95,
            color: COLORS.text,
            textTransform: 'uppercase',
          }}
        >
          {name}
        </div>
      </div>
      <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FireMode label="PRINCIPAL" text={primary} />
        <FireMode label="ALTERNATIVO" text={alt} />
      </div>
    </div>
  );
}

function FireMode({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: 24,
          letterSpacing: '0.2em',
          color: COLORS.emberLight,
          width: 210,
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: FONTS.body, fontWeight: 700, fontSize: 44, color: COLORS.text }}>
        {text}
      </span>
    </div>
  );
}

interface EnemyCardProps {
  name: string;
  health: number;
  behaviour: string;
  start: number;
}

/** Ficha de enemigo: nombre, salud y una línea de comportamiento. */
export function EnemyCard({ name, health, behaviour, start }: EnemyCardProps) {
  const { opacity, offset } = useSlideIn(start);
  const frame = useCurrentFrame();
  const bar = interpolate(frame - start, [8, 30], [0, health / 130], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        bottom: 96,
        width: 720,
        padding: '26px 34px 30px',
        background: 'linear-gradient(90deg, rgba(10,7,6,0.9), rgba(10,7,6,0.55))',
        borderLeft: `8px solid ${COLORS.ember}`,
        opacity,
        transform: `translateX(${offset}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.title,
          fontWeight: 900,
          fontSize: 100,
          lineHeight: 1,
          color: COLORS.text,
        }}
      >
        {name.toUpperCase()}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 24,
            letterSpacing: '0.2em',
            color: COLORS.emberLight,
          }}
        >
          SALUD {health}
        </span>
        <div style={{ flex: 1, height: 12, background: COLORS.metal }}>
          <div
            style={{
              width: `${bar * 100}%`,
              height: '100%',
              background: COLORS.keyRed,
              boxShadow: `0 0 10px ${COLORS.keyRed}`,
            }}
          />
        </div>
      </div>
      <div
        style={{
          marginTop: 16,
          fontFamily: FONTS.body,
          fontWeight: 500,
          fontSize: 44,
          color: COLORS.text,
        }}
      >
        {behaviour}
      </div>
    </div>
  );
}
