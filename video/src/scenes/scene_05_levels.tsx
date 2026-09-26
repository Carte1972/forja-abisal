import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { KeyIcons } from '../components/key_icons';
import { LevelPlan } from '../components/level_plan';
import { Darken, Fade, FoundryFlash } from '../components/overlays';
import { SectionTitle } from '../components/section_title';
import { Shot } from '../components/shot';
import { Subtitles } from '../components/subtitles';
import { narrationAt, type SceneProps } from '../scene_props';
import { COLORS, FONTS } from '../theme';

interface LevelInfo {
  number: number;
  name: string;
  detail: string;
  clip: string;
  plan: string;
  /** Salas que se encienden y en qué punto de la narración (fracción de la escena). */
  highlights: readonly (readonly [readonly string[], number])[];
  /** Punto de la narración en que suena la alarma de la salida (solo el último nivel). */
  alarmAt?: number;
}

const LEVELS: readonly LevelInfo[] = [
  {
    number: 1,
    name: 'FUNDICIÓN CERO',
    detail: '13 enemigos · Lava',
    clip: 'nivel_1_panoramica',
    plan: 'nivel_1_fundicion_cero.svg',
    highlights: [
      [['lava_oeste', 'lava_este', 'puente'], 0.36],
      [['sotano', 'ascensor_sotano'], 0.41],
      [['patio', 'plataforma'], 0.46],
    ],
  },
  {
    number: 2,
    name: 'POZOS DE CENIZA',
    detail: '21 enemigos · Ácido · Cielo abierto',
    clip: 'nivel_2_panoramica',
    plan: 'nivel_2_pozos_de_ceniza.svg',
    highlights: [
      [['anillo_sur', 'anillo_norte', 'anillo_este', 'anillo_oeste', 'anillo_inferior'], 0.56],
      [['pozo_acido', 'ascensor_pozo'], 0.62],
    ],
  },
  {
    number: 3,
    name: 'NÚCLEO ABISAL',
    detail: '34 enemigos · Lava y ácido',
    clip: 'nivel_3_panoramica',
    plan: 'nivel_3_nucleo_abisal.svg',
    highlights: [
      [['lago_lava'], 0.73],
      [['torre', 'isla', 'ascensor_torre'], 0.78],
      [['armeria'], 0.84],
      [['sala_salida'], 0.91],
    ],
    alarmAt: 0.91,
  },
];

/**
 * Escena 5: los tres niveles. Primero los tres planos y las llaves; después, cada nivel con su
 * panorámica y su plano, que se dibuja trazo a trazo y enciende las salas que va nombrando la
 * narración.
 */
export function LevelsScene({ timing }: SceneProps) {
  const at = (fraction: number) => narrationAt(timing, fraction);
  const end = timing.durationInFrames;
  const cuts = [at(0.29), at(0.5), at(0.67), end];
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <Sequence durationInFrames={cuts[0]!} name="tres niveles">
        <Fade duration={cuts[0]!} fadeIn={12} fadeOut={8}>
          <Intro keysAt={at(0.19)} />
        </Fade>
      </Sequence>
      {LEVELS.map((level, i) => {
        const from = cuts[i]!;
        const to = cuts[i + 1]!;
        const highlights = level.highlights.map(
          ([sectors, fraction]) => [sectors, at(fraction) - from] as const,
        );
        return (
          <Shot
            key={level.clip}
            clip={level.clip}
            from={from}
            to={to}
            fadeIn={6}
            fadeOut={i === 2 ? 24 : 6}
          >
            <Darken opacity={0.25} />
            <AbsoluteFill style={{ padding: '80px 96px' }}>
              <SectionTitle
                kicker={`NIVEL ${level.number}`}
                text={level.name}
                detail={level.detail}
                start={6}
                align="left"
                size={110}
              />
            </AbsoluteFill>
            <PlanPanel
              file={level.plan}
              highlights={highlights}
              alarmAt={level.alarmAt === undefined ? undefined : at(level.alarmAt) - from}
            />
          </Shot>
        );
      })}
      <FoundryFlash at={cuts[0]! - 4} length={22} />
      <FoundryFlash at={cuts[1]! - 4} length={22} />
      <FoundryFlash at={cuts[2]! - 4} length={22} />
      <Subtitles captions={timing.captions} offset={timing.narrationFrom} />
    </AbsoluteFill>
  );
}

function Intro({ keysAt }: { keysAt: number }) {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [10, 110], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rooms = interpolate(frame, [60, 120], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 110%, rgba(156,48,8,0.55), ${COLORS.background} 65%)`,
        alignItems: 'center',
        paddingTop: 70,
        gap: 40,
      }}
    >
      <SectionTitle
        text="TRES NIVELES"
        detail="Cada uno más hondo que el anterior"
        start={4}
        size={120}
      />
      <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
        {LEVELS.map((level) => (
          <div key={level.plan} style={{ width: 520, opacity: 0.95 }}>
            <LevelPlan
              file={level.plan}
              draw={draw}
              rooms={rooms}
              markers={0}
              width={520}
              height={560}
            />
          </div>
        ))}
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 36, opacity: frame >= keysAt ? 1 : 0 }}
      >
        <KeyIcons start={keysAt} size={90} gap={10} />
        <span style={{ fontFamily: FONTS.body, fontWeight: 700, fontSize: 48, color: COLORS.text }}>
          Tres llaves por nivel
        </span>
      </div>
    </AbsoluteFill>
  );
}

interface PlanPanelProps {
  file: string;
  highlights: readonly (readonly [readonly string[], number])[];
  alarmAt: number | undefined;
}

function PlanPanel({ file, highlights, alarmAt }: PlanPanelProps) {
  const frame = useCurrentFrame();
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
  const appear = interpolate(frame, [0, 12], [0, 1], clamp);
  const draw = interpolate(frame, [6, 70], [0, 1], clamp);
  const rooms = interpolate(frame, [40, 80], [0, 1], clamp);
  const markers = interpolate(frame, [70, 86], [0, 1], clamp);
  const lit: Record<string, number> = {};
  for (const [sectors, start] of highlights) {
    const value = interpolate(frame, [start, start + 12], [0, 1], clamp);
    for (const sector of sectors) lit[sector] = value;
  }
  const alarm =
    alarmAt === undefined || frame < alarmAt ? 0 : 0.5 + 0.5 * Math.sin((frame - alarmAt) / 5);
  return (
    <div
      style={{
        position: 'absolute',
        right: 80,
        top: 90,
        bottom: 90,
        width: 760,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(8,5,4,0.72)',
        border: `2px solid rgba(255,138,58,0.35)`,
        opacity: appear,
      }}
    >
      <LevelPlan
        file={file}
        draw={draw}
        rooms={rooms}
        markers={markers}
        highlight={lit}
        alarm={alarm}
        width={712}
        height={852}
      />
    </div>
  );
}
