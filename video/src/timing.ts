import { parseSrt, type Caption } from '@remotion/captions';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { getStaticFiles, staticFile, type CalculateMetadataFunction } from 'remotion';
import { FPS } from './theme';

export type SceneId =
  'gancho' | 'historia' | 'controles_y_armas' | 'enemigos' | 'niveles' | 'trucos' | 'cierre';

interface SceneConfig {
  id: SceneId;
  title: string;
  /** Archivo de narración en public/narracion/ (el nombre que da el guion). */
  audio: string;
  /** Segundos de narración si aún no hay audio (estimación del guion a 150 palabras/min). */
  fallbackSeconds: number;
  /** Margen antes de que empiece a hablar la voz. */
  lead: number;
  /** Margen después de que termine. */
  tail: number;
}

/** Las 7 escenas del guion (video/guion.md), en orden. */
export const SCENES: readonly SceneConfig[] = [
  {
    id: 'gancho',
    title: 'Gancho',
    audio: 'escena_01_gancho',
    fallbackSeconds: 9,
    lead: 0.3,
    tail: 2.6,
  },
  {
    id: 'historia',
    title: 'Historia',
    audio: 'escena_02_historia',
    fallbackSeconds: 30,
    lead: 0.5,
    tail: 0.9,
  },
  {
    id: 'controles_y_armas',
    title: 'Controles y armas',
    audio: 'escena_03_controles_y_armas',
    fallbackSeconds: 31,
    lead: 0.4,
    tail: 1,
  },
  {
    id: 'enemigos',
    title: 'Enemigos',
    audio: 'escena_04_enemigos',
    fallbackSeconds: 22,
    lead: 0.3,
    tail: 1,
  },
  {
    id: 'niveles',
    title: 'Los tres niveles',
    audio: 'escena_05_niveles',
    fallbackSeconds: 40,
    lead: 0.4,
    tail: 1.4,
  },
  {
    id: 'trucos',
    title: 'Trucos',
    audio: 'escena_06_trucos',
    fallbackSeconds: 28,
    lead: 0.4,
    tail: 1,
  },
  {
    id: 'cierre',
    title: 'Cierre',
    audio: 'escena_07_cierre',
    fallbackSeconds: 11,
    lead: 0.4,
    tail: 1.3,
  },
];

export interface SceneTiming {
  id: SceneId;
  /** Fotograma de inicio en el vídeo completo. */
  from: number;
  durationInFrames: number;
  /** Fotograma (dentro de la escena) en el que empieza la narración. */
  narrationFrom: number;
  narrationFrames: number;
  /** Ruta del audio de narración, o null si todavía no existe. */
  audio: string | null;
  /** Subtítulos de la escena, si hay un public/subtitulos/<escena>.srt. */
  captions: Caption[];
}

export interface PresentationProps {
  [key: string]: unknown;
  scenes: SceneTiming[];
  music: boolean;
}

export const toFrames = (seconds: number): number => Math.round(seconds * FPS);

/** Si existe un archivo en public/ (sin pedirlo a la red: así no hay errores 404). */
function exists(name: string): boolean {
  return getStaticFiles().some((file) => file.name === name);
}

async function loadCaptions(audio: string): Promise<Caption[]> {
  const name = `subtitulos/${audio}.srt`;
  if (!exists(name)) return [];
  const input = await (await fetch(staticFile(name))).text();
  return parseSrt({ input }).captions;
}

/** Tiempos de todas las escenas a partir de la duración real de cada narración. */
export async function sceneTimings(): Promise<SceneTiming[]> {
  const timings: SceneTiming[] = [];
  let from = 0;
  for (const scene of SCENES) {
    const name = `narracion/${scene.audio}.wav`;
    const src = staticFile(name);
    const available = exists(name);
    const seconds = available ? await getAudioDurationInSeconds(src) : scene.fallbackSeconds;
    const narrationFrom = toFrames(scene.lead);
    const narrationFrames = toFrames(seconds);
    const durationInFrames = narrationFrom + narrationFrames + toFrames(scene.tail);
    timings.push({
      id: scene.id,
      from,
      durationInFrames,
      narrationFrom,
      narrationFrames,
      audio: available ? src : null,
      captions: await loadCaptions(scene.audio),
    });
    from += durationInFrames;
  }
  return timings;
}

/** La duración del vídeo la marcan las narraciones: si cambian, el montaje se reajusta solo. */
export const calculatePresentationMetadata: CalculateMetadataFunction<PresentationProps> = async ({
  props,
}) => {
  const scenes = await sceneTimings();
  const last = scenes[scenes.length - 1]!;
  return {
    durationInFrames: last.from + last.durationInFrames,
    props: { ...props, scenes, music: exists('musica/fondo.wav') },
  };
};
