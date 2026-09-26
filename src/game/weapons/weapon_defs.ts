/** Datos de las cinco armas. Todo el diseño y los nombres son originales. */

export type WeaponId = 'hammer' | 'pistol' | 'shotgun' | 'riveter' | 'launcher';
export type AmmoType = 'bullets' | 'shells' | 'charges';
export type FireMode = 'primary' | 'alt';

export const WEAPON_ORDER: readonly WeaponId[] = [
  'hammer',
  'pistol',
  'shotgun',
  'riveter',
  'launcher',
];
export const AMMO_TYPES: readonly AmmoType[] = ['bullets', 'shells', 'charges'];

export interface FireModeDef {
  kind: 'melee' | 'hitscan' | 'projectile';
  /** Segundos entre disparos. */
  cooldown: number;
  ammoPerShot: number;
  /** Proyectiles o perdigones por disparo. */
  pellets: number;
  /** Dispersión máxima (radianes) respecto a la dirección de la mirilla. */
  spread: number;
  damage: number;
  /** Alcance en metros (cuerpo a cuerpo e impactos instantáneos). */
  range: number;
  /** Retroceso de cámara hacia arriba (radianes). */
  recoil: number;
  /** Empuje que recibe el objetivo (m/s). */
  knockback: number;
  /** Radio del ruido que alerta a los enemigos (m). */
  noise: number;
  projectile?: 'charge' | 'bouncer';
  /** Ráfaga automática de varios disparos con una sola pulsación. */
  burst?: { count: number; interval: number };
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  slot: number;
  ammo: AmmoType | null;
  /** Capacidad del cargador (0 = sin cargador, dispara directamente de la reserva). */
  magazine: number;
  reloadTime: number;
  /** Tiempo total de cambio de arma (bajar + subir). */
  switchTime: number;
  primary: FireModeDef;
  alt: FireModeDef;
}

const deg = (d: number) => (d * Math.PI) / 180;

export const WEAPONS: Readonly<Record<WeaponId, WeaponDef>> = {
  hammer: {
    id: 'hammer',
    name: 'Martillo de pistón',
    slot: 1,
    ammo: null,
    magazine: 0,
    reloadTime: 0,
    switchTime: 0.35,
    primary: {
      kind: 'melee',
      cooldown: 0.45,
      ammoPerShot: 0,
      pellets: 1,
      spread: 0,
      damage: 30,
      range: 1.8,
      recoil: deg(1),
      knockback: 4,
      noise: 4,
    },
    // Golpe cargado: más lento, mucho más fuerte y con empuje.
    alt: {
      kind: 'melee',
      cooldown: 1.1,
      ammoPerShot: 0,
      pellets: 1,
      spread: 0,
      damage: 85,
      range: 2,
      recoil: deg(3),
      knockback: 12,
      noise: 8,
    },
  },
  pistol: {
    id: 'pistol',
    name: 'Pistola de servicio',
    slot: 2,
    ammo: 'bullets',
    magazine: 12,
    reloadTime: 1.1,
    switchTime: 0.4,
    primary: {
      kind: 'hitscan',
      cooldown: 0.28,
      ammoPerShot: 1,
      pellets: 1,
      spread: deg(0.6),
      damage: 14,
      range: 120,
      recoil: deg(1.6),
      knockback: 1,
      noise: 30,
    },
    // Ráfaga de tres balas, menos precisa.
    alt: {
      kind: 'hitscan',
      cooldown: 0.6,
      ammoPerShot: 1,
      pellets: 1,
      spread: deg(2.2),
      damage: 14,
      range: 120,
      recoil: deg(1.2),
      knockback: 1,
      noise: 30,
      burst: { count: 3, interval: 0.07 },
    },
  },
  shotgun: {
    id: 'shotgun',
    name: 'Escopeta de dispersión',
    slot: 3,
    ammo: 'shells',
    magazine: 2,
    reloadTime: 1.4,
    switchTime: 0.5,
    primary: {
      kind: 'hitscan',
      cooldown: 0.55,
      ammoPerShot: 1,
      pellets: 8,
      spread: deg(5.5),
      damage: 9,
      range: 60,
      recoil: deg(5),
      knockback: 3,
      noise: 40,
    },
    // Los dos cañones a la vez: el doble de perdigones, más abiertos.
    alt: {
      kind: 'hitscan',
      cooldown: 0.8,
      ammoPerShot: 2,
      pellets: 18,
      spread: deg(9),
      damage: 9,
      range: 45,
      recoil: deg(9),
      knockback: 7,
      noise: 50,
    },
  },
  riveter: {
    id: 'riveter',
    name: 'Remachadora',
    slot: 4,
    ammo: 'bullets',
    magazine: 50,
    reloadTime: 1.8,
    switchTime: 0.5,
    primary: {
      kind: 'hitscan',
      cooldown: 0.09,
      ammoPerShot: 1,
      pellets: 1,
      spread: deg(2),
      damage: 10,
      range: 100,
      recoil: deg(0.9),
      knockback: 1,
      noise: 35,
    },
    // Modo sobrecargado: más cadencia a costa de precisión.
    alt: {
      kind: 'hitscan',
      cooldown: 0.055,
      ammoPerShot: 1,
      pellets: 1,
      spread: deg(4.5),
      damage: 10,
      range: 100,
      recoil: deg(1.1),
      knockback: 1,
      noise: 40,
    },
  },
  launcher: {
    id: 'launcher',
    name: 'Lanzacargas',
    slot: 5,
    ammo: 'charges',
    magazine: 4,
    reloadTime: 2,
    switchTime: 0.6,
    primary: {
      kind: 'projectile',
      cooldown: 0.8,
      ammoPerShot: 1,
      pellets: 1,
      spread: 0,
      damage: 110,
      range: 0,
      recoil: deg(4),
      knockback: 0,
      noise: 50,
      projectile: 'charge',
    },
    // Carga rebotadora que sigue una parábola y estalla con retardo.
    alt: {
      kind: 'projectile',
      cooldown: 0.9,
      ammoPerShot: 1,
      pellets: 1,
      spread: 0,
      damage: 110,
      range: 0,
      recoil: deg(3),
      knockback: 0,
      noise: 45,
      projectile: 'bouncer',
    },
  },
};

export const MAX_AMMO: Readonly<Record<AmmoType, number>> = {
  bullets: 250,
  shells: 50,
  charges: 30,
};
