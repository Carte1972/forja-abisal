/**
 * Tipos de un nivel ya validado y normalizado (ver level_parser.ts).
 * Coordenadas: X hacia el este, Z hacia el sur, Y hacia arriba. El norte es -Z.
 */

export type Point2 = readonly [number, number];

export type KeyColor = 'red' | 'blue' | 'yellow';
export const KEY_COLORS: readonly KeyColor[] = ['red', 'blue', 'yellow'];

/** Plano inclinado: la superficie vale `height` en `from` y `toHeight` en `to`. */
export interface SlopeData {
  from: Point2;
  to: Point2;
  toHeight: number;
}

export interface SurfaceData {
  height: number;
  texture: string;
  slope?: SlopeData;
}

export interface WallTextures {
  middle: string;
  upper: string;
  lower: string;
}

export interface DamageSpecial {
  type: 'damage';
  damagePerSecond: number;
}

/** Puerta que sube: `ceiling.height` del sector es la altura abierta; empieza cerrada. */
export interface DoorSpecial {
  type: 'door';
  key?: KeyColor;
  /** Velocidad en m/s. */
  speed: number;
  /** Segundos abierta antes de cerrarse sola; 0 = se queda abierta. */
  waitTime: number;
  texture: string;
  /** Pared secreta: usa la textura de pared y no se muestra como puerta. */
  hidden: boolean;
}

/** Ascensor: el suelo está arriba (`floor.height`) y baja hasta `lowHeight`. */
export interface LiftSpecial {
  type: 'lift';
  lowHeight: number;
  speed: number;
  waitTime: number;
  texture: string;
}

export type SectorSpecial = DamageSpecial | DoorSpecial | LiftSpecial;

export interface SectorData {
  index: number;
  id?: string;
  /** Anillo exterior normalizado en sentido antihorario (área con signo positiva en XZ). */
  outer: number[];
  /** Huecos normalizados en sentido horario. */
  holes: number[][];
  floor: SurfaceData;
  ceiling: SurfaceData;
  /** Sin techo visible: se ve el cielo. */
  sky: boolean;
  walls: WallTextures;
  /** Nivel de luz de 0 a 1. */
  light: number;
  special?: SectorSpecial;
  secret: boolean;
}

export interface SlabData {
  index: number;
  /** Anillo normalizado en sentido antihorario. */
  outer: number[];
  bottom: number;
  top: number;
  textures: { top: string; bottom: string; side: string };
  /** Si no se indica, se usa la luz del sector que contiene la losa. */
  light?: number;
}

export interface ThingData {
  type: string;
  position: Point2;
  /** Altura explícita (por ejemplo, encima de una losa); si no, la del suelo del sector. */
  y?: number;
  /** Orientación en radianes; 0 mira al norte (-Z) y crece en sentido antihorario visto desde arriba. */
  angle: number;
  properties: Record<string, unknown>;
}

export interface EnvironmentData {
  /** Niebla lineal por distancia (colores como 0xRRGGBB). */
  fog: { color: number; near: number; far: number };
  /** Cielo procedural: degradado de cenit a horizonte y suelo, con nubes (0 = despejado, 1 = cubierto). */
  sky: { top: number; horizon: number; bottom: number; clouds: number };
  /** Luz ambiental base (se multiplica por la luz de cada sector). */
  ambient: { color: number; intensity: number };
  /**
   * Sol: luz direccional con sombras que ilumina las zonas con cielo (solo se crea si el nivel
   * tiene sectores con cielo). `null` = sin sol. `direction` apunta hacia donde viaja la luz.
   */
  sun: { color: number; intensity: number; direction: [number, number, number] } | null;
}

export interface LevelData {
  version: 1;
  name: string;
  environment: EnvironmentData;
  vertices: Point2[];
  sectors: SectorData[];
  slabs: SlabData[];
  things: ThingData[];
}
