import type { Action } from '../engine/input/bindings';
import type { KeyColor } from '../engine/level/level_types';
import type { EnemyKind } from '../game/enemies/enemy_defs';
import type { AmmoType, WeaponId } from '../game/weapons/weapon_defs';
import type { CameraPath } from './camera_path';

/**
 * Definición de un clip del vídeo de presentación (un archivo por clip en `video/clips/`).
 * Coordenadas en metros como en los niveles: x al este, z al sur, y hacia arriba. Ángulos en
 * grados: yaw 0 mira al norte y 90 al oeste; pitch positivo hacia arriba.
 */
export interface ClipDefinition {
  /** Igual que el nombre del archivo, sin extensión. */
  id: string;
  /** Qué se ve, para quien lea el archivo. */
  description: string;
  level: ClipLevel;
  /** Segundos grabados. */
  duration: number;
  camera: FreeCamera | PlayerCamera;
  /** HUD y punto de mira. Por defecto, ocultos. */
  hud?: boolean;
  /** Arma en primera persona. Por defecto, visible con la cámara del jugador y oculta en la libre. */
  viewmodel?: boolean;
  /** Si se crean los enemigos del nivel. Por defecto, sí. */
  levelEnemies?: boolean;
  /** Armas y munición del jugador; `weapon` es la que lleva en la mano. */
  loadout?: {
    weapons: WeaponId[];
    ammo?: Partial<Record<AmmoType, number>>;
    weapon?: WeaponId;
    keys?: KeyColor[];
  };
  /** Campo de visión en grados. Por defecto, 75 (el del juego). */
  fov?: number;
  /**
   * Segundos que se simulan antes del primer fotograma, sin grabarlos (cambio de arma, enemigos
   * que empiezan a moverse). Por defecto, 0,5.
   */
  warmup?: number;
  /** Semilla del azar cosmético del clip (`Math.random`). */
  seed?: number;
  actions?: ClipAction[];
}

export type ClipLevel = 'level_01' | 'level_02' | 'level_03';

/** Cámara que sigue un recorrido, independiente del jugador. */
export interface FreeCamera {
  mode: 'free';
  path: CameraPath;
  /**
   * El jugador (invisible e invulnerable) acompaña a la cámara: los enemigos la ven, la
   * persiguen y le disparan. Si no, el jugador se queda en el inicio del nivel.
   */
  playerFollows?: boolean;
  /**
   * Dónde se queda el jugador (invisible) si no acompaña a la cámara: [x, z]. Sirve para que los
   * enemigos disparen hacia un punto que se ve de lado. Por defecto, el inicio del nivel.
   */
  playerAt?: readonly [number, number];
}

/** Vista del jugador, con su física: anda, salta y dispara según las acciones del clip. */
export interface PlayerCamera {
  mode: 'player';
  /** Dónde empieza: posición en planta [x, z], altura de los pies (por defecto, el suelo) y yaw. */
  start: { pos: readonly [number, number]; y?: number; yaw: number; pitch?: number };
  /** Hacia dónde mira a lo largo del clip. Sin él, mantiene la orientación inicial. */
  look?: CameraPath;
  /**
   * Intervalos en los que la mirada sigue a un enemigo creado con `spawn` (para apuntar a
   * blancos que se mueven). Entra y sale con una transición suave de 0,2 s.
   */
  aim?: readonly { enemy: string; from: number; to: number }[];
}

export type ClipAction =
  /** Pulsa una acción del jugador (avanzar, saltar, disparar…) y la mantiene `hold` segundos. */
  | { do: 'input'; at: number; hold?: number; input: Action }
  /** Hace aparecer un enemigo; `name` sirve para referirse a él en otras acciones. */
  | {
      do: 'spawn';
      at: number;
      name: string;
      kind: EnemyKind;
      pos: readonly [number, number];
      /** Altura de los pies; por defecto, el suelo (más la de vuelo si vuela). */
      y?: number;
      yaw?: number;
      patrol?: readonly (readonly [number, number])[];
    }
  /** Un enemigo hiere a otro por error: se pelearán entre ellos. */
  | { do: 'provoke'; at: number; attacker: string; victim: string };
