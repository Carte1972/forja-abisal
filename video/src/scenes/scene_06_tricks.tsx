import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { Fade } from '../components/overlays';
import { SectionTitle } from '../components/section_title';
import { Shot } from '../components/shot';
import { Subtitles } from '../components/subtitles';
import { narrationAt, type SceneProps } from '../scene_props';
import { COLORS, FONTS } from '../theme';

const TRICKS = [
  {
    clip: 'truco_secreto',
    start: 0.3,
    title: 'Secretos',
    text: 'Pulsa E en las paredes sospechosas',
  },
  { clip: 'truco_pelea', start: 0.3, title: 'Peleas', text: 'Deja que se peleen entre ellos' },
  {
    clip: 'truco_salto_carga',
    start: 0,
    title: 'Salto con carga',
    text: 'Salta y dispara al suelo',
  },
  { clip: 'truco_automapa', start: 0.4, title: 'Automapa', text: 'Tecla Tab' },
] as const;

/** Escena 6: «trucos del oficio», cada uno con su clip y su rótulo. */
export function TricksScene({ timing }: SceneProps) {
  const at = (fraction: number) => narrationAt(timing, fraction);
  const end = timing.durationInFrames;
  const cuts = [at(0.152), at(0.439), at(0.619), at(0.801), end];
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <Sequence durationInFrames={cuts[0]!} name="trucos del oficio">
        <Fade duration={cuts[0]!} fadeIn={12} fadeOut={6}>
          <AbsoluteFill
            style={{
              justifyContent: 'center',
              background: `radial-gradient(ellipse at 50% 100%, rgba(156,48,8,0.5), ${COLORS.background} 60%)`,
            }}
          >
            <SectionTitle text="TRUCOS DEL OFICIO" start={8} size={140} />
          </AbsoluteFill>
        </Fade>
      </Sequence>
      {TRICKS.map((trick, i) => (
        <Shot
          key={trick.clip}
          clip={trick.clip}
          from={cuts[i]!}
          to={cuts[i + 1]!}
          start={trick.start}
          fadeOut={i === TRICKS.length - 1 ? 20 : 8}
        >
          <TrickCaption index={i + 1} title={trick.title} text={trick.text} />
        </Shot>
      ))}
      <Subtitles captions={timing.captions} offset={timing.narrationFrom} />
    </AbsoluteFill>
  );
}

function TrickCaption({ index, title, text }: { index: number; title: string; text: string }) {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [4, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        top: 90,
        display: 'flex',
        alignItems: 'stretch',
        opacity: t,
        transform: `translateX(${(1 - t) * -60}px)`,
      }}
    >
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 110,
          fontFamily: FONTS.title,
          fontWeight: 900,
          fontSize: 76,
          color: COLORS.background,
          background: `linear-gradient(180deg, ${COLORS.emberLight}, ${COLORS.ember})`,
        }}
      >
        {String(index).padStart(2, '0')}
      </div>
      <div style={{ padding: '14px 30px', background: 'rgba(8,5,4,0.85)' }}>
        <div
          style={{
            fontFamily: FONTS.title,
            fontWeight: 900,
            fontSize: 72,
            lineHeight: 1,
            color: COLORS.text,
          }}
        >
          {title.toUpperCase()}
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontWeight: 500,
            fontSize: 42,
            color: COLORS.emberLight,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}
