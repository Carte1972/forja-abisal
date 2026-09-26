import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { fitRate } from '../clips';
import { EnemyCard } from '../components/cards';
import { Clip } from '../components/clip';
import { Fade, FoundryFlash, Vignette } from '../components/overlays';
import { SectionTitle } from '../components/section_title';
import { Shot } from '../components/shot';
import { Subtitles } from '../components/subtitles';
import { narrationAt, type SceneProps } from '../scene_props';
import { COLORS, FONTS, FPS } from '../theme';

const ENEMIES = [
  {
    name: 'Centinela',
    health: 60,
    behaviour: 'Ráfagas de tres disparos a distancia',
    clip: 'enemigo_centinela',
    start: 0.3,
  },
  {
    name: 'Rastrero',
    health: 45,
    behaviour: 'Rápido. Ataca cuerpo a cuerpo',
    clip: 'enemigo_rastrero',
    start: 0.6,
  },
  {
    name: 'Escupidor',
    health: 130,
    behaviour: 'Bolas de ácido en parábola',
    clip: 'enemigo_escupidor',
    start: 0.4,
  },
  {
    name: 'Vigía',
    health: 55,
    behaviour: 'Vuela. Descargas de energía',
    clip: 'enemigo_vigia',
    start: 0.3,
  },
] as const;

/**
 * Escena 4: «no estás solo», una ficha por enemigo cuando la narración lo nombra y, al final,
 * los cuatro a la vez con «te ven, te oyen, te persiguen».
 */
export function EnemiesScene({ timing }: SceneProps) {
  const at = (fraction: number) => narrationAt(timing, fraction);
  const end = timing.durationInFrames;
  const cuts = [at(0.171), at(0.32), at(0.496), at(0.631), at(0.744)];
  const mosaicFrom = cuts[4]!;
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <Sequence durationInFrames={cuts[0]!} name="no estás solo">
        <Fade duration={cuts[0]!} fadeIn={10} fadeOut={6}>
          <AbsoluteFill style={{ justifyContent: 'center' }}>
            <SectionTitle text="NO ESTÁS SOLO" start={at(0.1)} size={150} />
          </AbsoluteFill>
        </Fade>
      </Sequence>
      {ENEMIES.map((enemy, i) => (
        <Shot
          key={enemy.clip}
          clip={enemy.clip}
          from={cuts[i]!}
          to={cuts[i + 1]!}
          start={enemy.start}
          fadeIn={4}
          fadeOut={4}
        >
          <EnemyCard
            name={enemy.name}
            health={enemy.health}
            behaviour={enemy.behaviour}
            start={3}
          />
        </Shot>
      ))}
      <Sequence from={mosaicFrom} durationInFrames={end - mosaicFrom} name="mosaico">
        <Fade duration={end - mosaicFrom} fadeIn={6} fadeOut={20}>
          <Mosaic frames={end - mosaicFrom} />
        </Fade>
      </Sequence>
      <FoundryFlash at={cuts[0]! - 4} length={20} />
      <Subtitles captions={timing.captions} offset={timing.narrationFrom} />
    </AbsoluteFill>
  );
}

function Mosaic({ frames }: { frames: number }) {
  const frame = useCurrentFrame();
  const words = ['TE VEN', 'TE OYEN', 'TE PERSIGUEN'];
  return (
    <AbsoluteFill>
      {ENEMIES.map((enemy, i) => (
        <div
          key={enemy.clip}
          style={{
            position: 'absolute',
            left: (i % 2) * 960,
            top: Math.floor(i / 2) * 540,
            width: 960,
            height: 540,
            overflow: 'hidden',
          }}
        >
          <Clip
            name={enemy.clip}
            from={enemy.start}
            rate={fitRate(enemy.clip, enemy.start, frames, FPS)}
          />
        </div>
      ))}
      <Vignette strength={0.85} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            gap: 40,
            padding: '20px 48px',
            background: 'rgba(8,5,4,0.82)',
            borderTop: `5px solid ${COLORS.ember}`,
            borderBottom: `5px solid ${COLORS.ember}`,
          }}
        >
          {words.map((word, i) => {
            const t = interpolate(frame - 10 - i * 28, [0, 10], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <span
                key={word}
                style={{
                  fontFamily: FONTS.title,
                  fontWeight: 900,
                  fontSize: 110,
                  color: i === 2 ? COLORS.ember : COLORS.text,
                  opacity: t,
                  transform: `scale(${1.3 - 0.3 * t})`,
                  textShadow: i === 2 ? `0 0 30px ${COLORS.ember}` : 'none',
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
