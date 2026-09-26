import type { ComponentType } from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile } from 'remotion';
import type { SceneProps } from './scene_props';
import { HOOK_TITLE_FRAME, HookScene } from './scenes/scene_01_hook';
import { StoryScene } from './scenes/scene_02_story';
import { ControlsScene } from './scenes/scene_03_controls';
import { EnemiesScene } from './scenes/scene_04_enemies';
import { LevelsScene } from './scenes/scene_05_levels';
import { TricksScene } from './scenes/scene_06_tricks';
import { CLOSING_SHOT_FRAMES, closingCutFrame, ClosingScene } from './scenes/scene_07_closing';
import { narrationAt } from './scene_props';
import { COLORS } from './theme';
import type { PresentationProps, SceneId, SceneTiming } from './timing';

export const SCENE_COMPONENTS: Record<SceneId, ComponentType<SceneProps>> = {
  gancho: HookScene,
  historia: StoryScene,
  controles_y_armas: ControlsScene,
  enemigos: EnemiesScene,
  niveles: LevelsScene,
  trucos: TricksScene,
  cierre: ClosingScene,
};

/** Volumen de la música sin narración, con narración y tiempo de las transiciones. */
const MUSIC_FULL = 0.55;
const MUSIC_UNDER_VOICE = 0.16;
const DUCK_FRAMES = 18;

/** La escena y su narración, colocadas en su sitio del vídeo completo. */
export function SceneWithVoice({ timing }: { timing: SceneTiming }) {
  const Scene = SCENE_COMPONENTS[timing.id];
  return (
    <Sequence from={timing.from} durationInFrames={timing.durationInFrames} name={timing.id}>
      <Scene timing={timing} />
      {timing.audio ? (
        <Sequence from={timing.narrationFrom} name={`voz ${timing.id}`}>
          <Audio src={timing.audio} />
        </Sequence>
      ) : null}
    </Sequence>
  );
}

/** Vídeo completo: las 7 escenas seguidas, la narración, la música de fondo y los golpes. */
export function Presentation({ scenes, music }: PresentationProps) {
  const closing = scenes[scenes.length - 1]!;
  const fadeFrom = closing.from + narrationAt(closing, 0.41);
  const fadeTo = closing.from + narrationAt(closing, 0.6);
  const voice = scenes.map((scene) => [
    scene.from + scene.narrationFrom,
    scene.from + scene.narrationFrom + scene.narrationFrames,
  ]);
  const musicVolume = (frame: number): number => {
    // Cuánto «pesa» la voz en este fotograma, con rampas suaves al entrar y salir.
    let duck = 0;
    for (const [start, end] of voice) {
      duck = Math.max(
        duck,
        interpolate(frame, [start! - DUCK_FRAMES, start!, end!, end! + DUCK_FRAMES], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
      );
    }
    const level = MUSIC_FULL + (MUSIC_UNDER_VOICE - MUSIC_FULL) * duck;
    const intro = interpolate(frame, [0, 90], [0, 1], { extrapolateRight: 'clamp' });
    const outro = interpolate(frame, [fadeFrom, fadeTo], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return level * intro * outro;
  };
  const finalHit = closing.from + closingCutFrame(closing) + CLOSING_SHOT_FRAMES;
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      {scenes.map((timing) => (
        <SceneWithVoice key={timing.id} timing={timing} />
      ))}
      {music ? (
        <>
          <Audio src={staticFile('musica/fondo.wav')} loop volume={musicVolume} />
          <Sequence from={scenes[0]!.from + HOOK_TITLE_FRAME - 6} name="golpe del título">
            <Audio src={staticFile('musica/golpe.wav')} volume={0.9} />
          </Sequence>
          <Sequence from={finalHit} name="golpe final">
            <Audio src={staticFile('musica/golpe.wav')} volume={1} />
          </Sequence>
        </>
      ) : null}
    </AbsoluteFill>
  );
}

/** Una sola escena (para revisarla en Remotion Studio), empezando en el fotograma 0. */
export function ScenePreview({ scenes, index }: PresentationProps & { index: number }) {
  const scene = scenes[index];
  if (!scene) return null;
  return <SceneWithVoice timing={{ ...scene, from: 0 }} />;
}
