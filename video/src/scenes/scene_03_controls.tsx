import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { WeaponCard } from '../components/cards';
import { ControlsTable } from '../components/controls_table';
import { SectionTitle } from '../components/section_title';
import { Shot } from '../components/shot';
import { Subtitles } from '../components/subtitles';
import { narrationAt, type SceneProps } from '../scene_props';
import { COLORS, FONTS } from '../theme';

const WEAPONS = [
  {
    slot: 1,
    name: 'Martillo de pistón',
    primary: 'Golpe rápido',
    alt: 'Golpe cargado',
    clip: 'arma_martillo',
    start: 0.6,
    altAt: 1.9,
  },
  {
    slot: 2,
    name: 'Pistola de servicio',
    primary: 'Tiro preciso',
    alt: 'Ráfaga de tres',
    clip: 'arma_pistola',
    start: 0.5,
    altAt: 2.2,
  },
  {
    slot: 3,
    name: 'Escopeta de dispersión',
    primary: 'Un cañón',
    alt: 'Dos cañones',
    clip: 'arma_escopeta',
    start: 0.8,
    altAt: 2.7,
  },
  {
    slot: 4,
    name: 'Remachadora',
    primary: 'Ráfaga continua',
    alt: 'Modo sobrecargado',
    clip: 'arma_remachadora',
    start: 0.5,
    altAt: 2.8,
  },
  {
    slot: 5,
    name: 'Lanzacargas',
    primary: 'Carga explosiva',
    alt: 'Carga rebotadora',
    clip: 'arma_lanzacargas',
    start: 0.4,
    altAt: 2.9,
  },
] as const;

/** Fondo oscuro a la izquierda para que se lean la tabla y las fichas sobre el clip. */
function LeftShade() {
  return (
    <AbsoluteFill
      style={{
        background:
          'linear-gradient(90deg, rgba(8,5,4,0.94) 0%, rgba(8,5,4,0.75) 38%, transparent 62%)',
      }}
    />
  );
}

/**
 * Escena 3: controles básicos con su tabla y las cinco armas, cada una con su ficha cuando la
 * narración la nombra. Al final, un montaje de los disparos alternativos.
 */
export function ControlsScene({ timing }: SceneProps) {
  const at = (fraction: number) => narrationAt(timing, fraction);
  const end = timing.durationInFrames;
  const weaponCuts = [at(0.3), at(0.43), at(0.53), at(0.635), at(0.72), at(0.83)];
  const altFrom = weaponCuts[5]!;
  const altStep = Math.floor((end - altFrom) / WEAPONS.length);
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <Shot clip="controles_recorrido" from={0} to={weaponCuts[0]!} fadeIn={14}>
        <LeftShade />
        <AbsoluteFill style={{ padding: '120px 96px', gap: 34 }}>
          <SectionTitle text="CONTROLES" start={6} align="left" size={96} />
          <ControlsTable start={24} />
        </AbsoluteFill>
      </Shot>
      {WEAPONS.map((weapon, i) => (
        <Shot
          key={weapon.clip}
          clip={weapon.clip}
          from={weaponCuts[i]!}
          to={weaponCuts[i + 1]!}
          start={weapon.start}
        >
          <LeftShade />
          <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: 96 }}>
            <WeaponCard
              slot={weapon.slot}
              name={weapon.name}
              primary={weapon.primary}
              alt={weapon.alt}
              start={4}
            />
          </AbsoluteFill>
        </Shot>
      ))}
      {WEAPONS.map((weapon, i) => (
        <Shot
          key={`alt-${weapon.clip}`}
          clip={weapon.clip}
          from={altFrom + i * altStep}
          to={i === WEAPONS.length - 1 ? end : altFrom + (i + 1) * altStep}
          start={weapon.altAt}
          fadeIn={4}
          fadeOut={i === WEAPONS.length - 1 ? 20 : 4}
        >
          <AltLabel name={weapon.name} />
        </Shot>
      ))}
      <Sequence from={altFrom} durationInFrames={end - altFrom} name="rótulo alternativo">
        <AltBanner />
      </Sequence>
      <Subtitles captions={timing.captions} offset={timing.narrationFrom} />
    </AbsoluteFill>
  );
}

function AltLabel({ name }: { name: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 96,
        bottom: 96,
        fontFamily: FONTS.mono,
        fontSize: 34,
        letterSpacing: '0.12em',
        color: COLORS.emberLight,
        background: 'rgba(8,5,4,0.8)',
        padding: '10px 20px',
      }}
    >
      {name.toUpperCase()} · ALTERNATIVO
    </div>
  );
}

function AltBanner() {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 90, opacity: t }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          padding: '18px 40px',
          background: 'rgba(8,5,4,0.85)',
          borderBottom: `6px solid ${COLORS.ember}`,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 40,
            color: COLORS.emberLight,
            padding: '8px 18px',
            border: `3px solid ${COLORS.metalLight}`,
            borderBottomWidth: 7,
            borderRadius: 8,
            background: COLORS.metal,
          }}
        >
          CLIC DERECHO
        </span>
        <span
          style={{ fontFamily: FONTS.title, fontWeight: 900, fontSize: 84, color: COLORS.text }}
        >
          DISPARO ALTERNATIVO
        </span>
      </div>
    </AbsoluteFill>
  );
}
