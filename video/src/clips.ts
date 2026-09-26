import type { ClipDefinition } from '../../src/recording/clip_types';
import armaEscopeta from '../clips/arma_escopeta';
import armaLanzacargas from '../clips/arma_lanzacargas';
import armaMartillo from '../clips/arma_martillo';
import armaPistola from '../clips/arma_pistola';
import armaRemachadora from '../clips/arma_remachadora';
import cierreLago from '../clips/cierre_lago';
import cierreRastrero from '../clips/cierre_rastrero';
import controlesRecorrido from '../clips/controles_recorrido';
import enemigoCentinela from '../clips/enemigo_centinela';
import enemigoEscupidor from '../clips/enemigo_escupidor';
import enemigoRastrero from '../clips/enemigo_rastrero';
import enemigoVigia from '../clips/enemigo_vigia';
import ganchoSaltoCarga from '../clips/gancho_salto_carga';
import historiaEntrada from '../clips/historia_entrada';
import historiaFundicion from '../clips/historia_fundicion';
import historiaRastrero from '../clips/historia_rastrero';
import historiaRonda from '../clips/historia_ronda';
import nivel1Panoramica from '../clips/nivel_1_panoramica';
import nivel2Panoramica from '../clips/nivel_2_panoramica';
import nivel3Panoramica from '../clips/nivel_3_panoramica';
import trucoAutomapa from '../clips/truco_automapa';
import trucoPelea from '../clips/truco_pelea';
import trucoSaltoCarga from '../clips/truco_salto_carga';
import trucoSecreto from '../clips/truco_secreto';

/** Definiciones de los clips que graba el juego (video/clips/), para saber cuánto duran. */
const CLIPS: readonly ClipDefinition[] = [
  armaEscopeta,
  armaLanzacargas,
  armaMartillo,
  armaPistola,
  armaRemachadora,
  cierreLago,
  cierreRastrero,
  controlesRecorrido,
  enemigoCentinela,
  enemigoEscupidor,
  enemigoRastrero,
  enemigoVigia,
  ganchoSaltoCarga,
  historiaEntrada,
  historiaFundicion,
  historiaRastrero,
  historiaRonda,
  nivel1Panoramica,
  nivel2Panoramica,
  nivel3Panoramica,
  trucoAutomapa,
  trucoPelea,
  trucoSaltoCarga,
  trucoSecreto,
];

/** Duración grabada de un clip, en segundos. */
export function clipSeconds(name: string): number {
  const clip = CLIPS.find((entry) => entry.id === name);
  if (!clip) throw new Error(`No existe el clip "${name}" en video/clips/.`);
  return clip.duration;
}

/**
 * Velocidad para que el clip, empezando en `from` segundos, llene `frames` fotogramas sin
 * acabarse antes: 1 si le sobra metraje; algo más lenta (nunca menos de 0,5) si le falta.
 */
export function fitRate(name: string, from: number, frames: number, fps: number): number {
  const available = clipSeconds(name) - from;
  const needed = frames / fps;
  return Math.max(0.5, Math.min(1, available / needed));
}
