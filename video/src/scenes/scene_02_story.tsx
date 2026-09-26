import { AbsoluteFill } from 'remotion';
import { Subtitles } from '../components/subtitles';
import { Shot } from '../components/shot';
import { TerminalLabel } from '../components/terminal_label';
import { narrationAt, type SceneProps } from '../scene_props';
import { FPS } from '../theme';
import { COLORS } from '../theme';

/**
 * Escena 2: la historia. Cada plano acompaña a su frase: el técnico que entra, la fundición que
 * trabaja sola, el guardia que sigue de ronda, el obrero que ya no es humano y, al final, el
 * técnico avanzando hacia el fondo. Los rótulos de terminal refuerzan la narración.
 */
export function StoryScene({ timing }: SceneProps) {
  const at = (fraction: number) => narrationAt(timing, fraction);
  const end = timing.durationInFrames;
  const cuts = [0, at(0.16), at(0.39), at(0.556), at(0.745), end];
  // El último plano retoma la entrada donde la dejó el primero.
  const entryResume = (cuts[1]! - cuts[0]!) / FPS;
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <Shot clip="historia_entrada" from={cuts[0]!} to={cuts[1]!} fadeIn={16} />
      <Shot clip="historia_fundicion" from={cuts[1]!} to={cuts[2]!} zoom={[1, 1.06]} />
      <Shot clip="historia_ronda" from={cuts[2]!} to={cuts[3]!} start={0.3} />
      <Shot clip="historia_rastrero" from={cuts[3]!} to={cuts[4]!} zoom={[1.04, 1]} />
      <Shot
        clip="historia_entrada"
        from={cuts[4]!}
        to={cuts[5]!}
        start={entryResume}
        fadeOut={20}
      />
      <TerminalLabel text="TURNO DE RELEVO: 1 TÉCNICO" from={at(0.01)} to={at(0.15)} />
      <TerminalLabel text="FORJA ABISAL · ESTADO: EN FUNCIONAMIENTO" from={at(0.2)} to={at(0.37)} />
      <TerminalLabel text="PERSONAL LOCALIZADO: 0" from={at(0.58)} to={at(0.75)} />
      <TerminalLabel text="SALIDA DE EMERGENCIA: NÚCLEO ABISAL" from={at(0.9)} to={end - 16} />
      <Subtitles captions={timing.captions} offset={timing.narrationFrom} />
    </AbsoluteFill>
  );
}
