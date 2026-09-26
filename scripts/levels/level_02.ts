import { LevelKit, rect } from './level_kit.ts';

/**
 * Nivel 2 — "Pozos de Ceniza" (dificultad media).
 *
 * Una sima a cielo abierto con tres alturas: el anillo superior (0 m), el anillo inferior (-3 m,
 * se baja por una rampa) y un pozo de ácido al fondo (-6 m) del que solo se sale en ascensor.
 * Un puente de rejilla cruza la sima a la altura del anillo superior.
 * - Llave roja: en el fondo del pozo de ácido.
 * - Puerta roja (norte): crematorio con entreplanta y la llave azul (y un secreto).
 * - Puerta azul (este): galerías que suben a una sala alta con la llave amarilla (y un secreto).
 * - Puerta amarilla (oeste): escalera que baja a la sala de salida.
 */
export function level02(): Record<string, unknown> {
  const k = new LevelKit(
    'Pozos de Ceniza',
    { floor: 'stone_floor', ceiling: 'metal_ceiling', walls: 'rock' },
    {
      fog: { color: '#141612', near: 18, far: 90 },
      sky: { top: '#0e1216', horizon: '#56643a', bottom: '#141612', clouds: 0.75 },
      ambient: { color: '#b8c0a8', intensity: 0.8 },
      sun: { color: '#d8e0a0', intensity: 1.8, direction: [-0.35, -0.8, 0.45] },
    },
  );
  const sky = { height: 20, sky: true };
  const acid = { type: 'damage', damagePerSecond: 15 };

  // Esclusa de entrada y pasillo.
  k.room(0, 0, 6, 6, {
    id: 'esclusa',
    floor: { height: 0, texture: 'metal_floor' },
    ceiling: { height: 4 },
    walls: 'tech_wall',
    light: 0.7,
  });
  k.room(2, -6, 4, 0, {
    id: 'pasillo',
    floor: { height: 0, texture: 'metal_floor' },
    ceiling: { height: 3.5 },
    walls: 'tech_wall',
    light: 0.5,
  });

  // Anillo superior (0 m), en cuatro franjas alrededor de la sima.
  k.room(-10, -12, 20, -6, { id: 'anillo_sur', floor: { height: 0 }, ceiling: sky, light: 0.9 });
  k.room(-10, -36, 20, -30, { id: 'anillo_norte', floor: { height: 0 }, ceiling: sky, light: 0.9 });
  k.room(-10, -30, -4, -12, { id: 'anillo_oeste', floor: { height: 0 }, ceiling: sky, light: 0.9 });
  k.sector(
    [
      [18, -30],
      [20, -30],
      [20, -12],
      [14, -12],
      [14, -24],
      [18, -24],
    ],
    { id: 'anillo_este', floor: { height: 0 }, ceiling: sky, light: 0.9 },
  );
  // Rampa del anillo superior al inferior.
  k.room(14, -30, 18, -24, {
    id: 'rampa_sima',
    floor: {
      height: 0,
      texture: 'metal_floor',
      slope: { from: [18, -27], to: [14, -27], toHeight: -3 },
    },
    ceiling: sky,
    light: 0.9,
  });
  // Anillo inferior (-3 m) alrededor del pozo de ácido.
  k.room(-4, -30, 14, -12, {
    id: 'anillo_inferior',
    floor: { height: -3, texture: 'dirt' },
    ceiling: sky,
    light: 0.75,
    holes: [rect(0, -26, 10, -16)],
  });
  // Pozo de ácido (-6 m) con un ascensor en la esquina sureste.
  k.sector(
    [
      [0, -26],
      [8, -26],
      [8, -24],
      [10, -24],
      [10, -16],
      [0, -16],
    ],
    {
      id: 'pozo_acido',
      floor: { height: -6, texture: 'acid' },
      ceiling: sky,
      light: 0.8,
      special: acid,
    },
  );
  k.room(8, -26, 10, -24, {
    id: 'ascensor_pozo',
    floor: { height: -3, texture: 'lift_top' },
    ceiling: sky,
    walls: 'tech_wall',
    special: { type: 'lift', lowHeight: -6, waitTime: 2 },
    light: 0.8,
  });
  // Puente de rejilla que cruza la sima a 0 m.
  k.slab(rect(-4, -21, 14, -19), -0.5, 0, 'metal_grate');

  // Puerta roja (norte) y crematorio con entreplanta.
  k.room(3, -37, 5, -36, {
    id: 'puerta_roja',
    floor: { height: 0 },
    ceiling: { height: 3.5 },
    walls: 'door_frame',
    special: { type: 'door', key: 'red' },
  });
  k.sector(
    [
      [2, -46],
      [10, -46],
      [10, -37],
      [-2, -37],
      [-2, -40],
      [2, -40],
    ],
    {
      id: 'crematorio',
      floor: { height: 0, texture: 'metal_floor' },
      ceiling: { height: 8 },
      walls: 'brick',
      light: 0.6,
    },
  );
  k.stairs(-2, -46, 2, -40, {
    dir: '-z',
    steps: 8,
    from: 0,
    to: 3,
    ceiling: 8,
    walls: { middle: 'brick', lower: 'stone_step' },
  });
  k.room(-2, -48, 10, -46, {
    id: 'entreplanta',
    floor: { height: 3, texture: 'metal_grate' },
    ceiling: { height: 8 },
    walls: 'brick',
    light: 0.55,
  });
  // Secreto 1: pared falsa al este de la entreplanta.
  k.room(10, -47.5, 10.5, -46.5, {
    id: 'pared_secreta_crematorio',
    floor: { height: 3 },
    ceiling: { height: 5.5 },
    walls: 'brick',
    special: { type: 'door', hidden: true, waitTime: 0 },
  });
  k.room(10.5, -48.5, 13.5, -45.5, {
    id: 'escondite_crematorio',
    floor: { height: 3 },
    ceiling: { height: 5.5 },
    walls: 'brick',
    light: 0.35,
    secret: true,
  });

  // Puerta azul (este) y galerías que suben a la sala alta.
  k.room(20, -24, 20.5, -22, {
    id: 'puerta_azul',
    floor: { height: 0 },
    ceiling: { height: 3.5 },
    walls: 'door_frame',
    special: { type: 'door', key: 'blue' },
  });
  k.room(20.5, -26, 26, -20, {
    id: 'galeria_baja',
    floor: { height: 0, texture: 'metal_floor' },
    ceiling: { height: 4 },
    walls: 'tech_wall',
    light: 0.55,
  });
  k.stairs(26, -26, 32, -20, {
    dir: '+x',
    steps: 10,
    from: 0,
    to: 4,
    ceiling: 8,
    walls: { middle: 'tech_wall', lower: 'stone_step' },
  });
  k.room(32, -32, 40, -14, {
    id: 'sala_alta',
    floor: { height: 4, texture: 'metal_floor' },
    ceiling: { height: 8 },
    walls: 'tech_wall',
    light: 0.65,
    holes: [rect(35, -25, 37, -23)],
  });
  // Secreto 2: pared falsa al sur de la sala alta.
  k.room(35, -14, 37, -13.5, {
    id: 'pared_secreta_galeria',
    floor: { height: 4 },
    ceiling: { height: 7 },
    walls: 'tech_wall',
    special: { type: 'door', hidden: true, waitTime: 0 },
  });
  k.room(34, -13.5, 38, -10.5, {
    id: 'escondite_galeria',
    floor: { height: 4, texture: 'metal_floor' },
    ceiling: { height: 7 },
    walls: 'tech_wall',
    light: 0.35,
    secret: true,
  });

  // Puerta amarilla (oeste), escalera de bajada y sala de salida.
  k.room(-10.5, -22, -10, -20, {
    id: 'puerta_amarilla',
    floor: { height: 0 },
    ceiling: { height: 3.5 },
    walls: 'door_frame',
    special: { type: 'door', key: 'yellow' },
  });
  k.room(-18, -23, -10.5, -19, {
    id: 'pasillo_salida',
    floor: { height: 0, texture: 'metal_floor' },
    ceiling: { height: 3.5 },
    walls: 'tech_wall',
    light: 0.5,
  });
  k.stairs(-24, -23, -18, -19, {
    dir: '-x',
    steps: 8,
    from: 0,
    to: -3,
    headroom: 3.5,
    walls: { middle: 'tech_wall', lower: 'stone_step' },
  });
  k.room(-32, -28, -24, -14, {
    id: 'sala_salida',
    floor: { height: -3, texture: 'metal_floor' },
    ceiling: { height: 2 },
    walls: 'tech_wall',
    light: 0.7,
  });

  k.thing('player_start', 3, 4.5, {
    angle: 0,
    weapons: ['pistol', 'shotgun'],
    ammo: { bullets: 60, shells: 16 },
  });

  // Enemigos.
  k.enemy('sentinel', -6, -9, 180);
  k.enemy('sentinel', 17, -9, 180, { patrol: [[8, -9]] });
  k.enemy('crawler', -7, -18, 90);
  k.enemy('crawler', -7, -26, 90);
  k.enemy('spitter', 5, -33, 180);
  k.enemy('sentinel', 16, -33, 180, { patrol: [[-6, -33]] });
  k.enemy('crawler', -2, -14, 0);
  k.enemy('crawler', 12, -14, 0);
  k.enemy('crawler', 12, -28, 0);
  k.enemy('watcher', 5, -13, 0);
  k.enemy('watcher', 5, -28, 180);
  k.enemy('sentinel', 0, -42, 180);
  k.enemy('sentinel', 8, -40, 180);
  k.enemy('spitter', 4, -47, 180);
  k.enemy('spitter', 24, -23, 90);
  k.enemy('sentinel', 34, -30, 180);
  k.enemy('sentinel', 38, -20, 90);
  k.enemy('crawler', 33, -16, 90);
  k.enemy('crawler', -28, -26, 270);
  k.enemy('crawler', -28, -16, 270);
  k.enemy('watcher', -27, -21, 270);

  // Objetos.
  k.pickup('ammo_shells', 1, 1);
  k.pickup('health', 5, 1);
  k.pickup('ammo_bullets', -8, -8);
  k.pickup('armor_small', 18, -8);
  k.pickup('armor_small', 18.8, -8);
  k.pickup('weapon_riveter', 18, -34);
  k.pickup('health_large', -8, -34);
  k.pickup('ammo_bullets', -8, -28);
  k.pickup('key_red', 2, -18);
  k.pickup('health', 12.5, -13.5);
  k.pickup('ammo_shells', -2.5, -28.5);
  k.pickup('health_small', 1, -27);
  k.pickup('health_small', 2, -27);
  k.pickup('key_blue', 8.5, -47);
  k.pickup('ammo_bullets', 9, -38);
  k.pickup('health', -1, -38);
  k.pickup('weapon_launcher', 12, -47);
  k.pickup('ammo_charges', 12, -46.2);
  k.pickup('armor', 12.8, -47.8);
  k.pickup('ammo_shells', 21.5, -21);
  k.pickup('key_yellow', 39, -15);
  k.pickup('health_large', 33, -31);
  k.pickup('ammo_bullets', 39, -31);
  k.pickup('ammo_charges', 35, -12);
  k.pickup('health_large', 37, -12);
  k.pickup('ammo_charges', 36, -11);
  k.pickup('health', -12, -21);
  k.pickup('ammo_shells', -25, -27);
  k.pickup('armor_small', -25, -15);

  // Luces.
  k.lamp(3, 3, '#ffe0b0', { radius: 8 });
  k.lamp(3, -3, '#ffc080', { radius: 7, flicker: 'broken' });
  k.lamp(5, -21, '#80ff60', { intensity: 1.4, radius: 14, flicker: 'pulse', y: -5 });
  k.lamp(-7, -21, '#ffd6a0', { intensity: 1.1, radius: 14, shadows: true });
  k.lamp(17, -21, '#ffd6a0', { intensity: 1.1, radius: 14 });
  k.lamp(4, -41, '#ff8040', { intensity: 1.2, radius: 12, flicker: 'flicker' });
  k.lamp(4, -47, '#ff6030', { radius: 9, flicker: 'pulse' });
  k.lamp(12, -47, '#ffe080', { intensity: 0.6, radius: 5 });
  k.lamp(23, -23, '#60e0ff', { radius: 8, flicker: 'strobe' });
  k.lamp(36, -18, '#60e0ff', { intensity: 1.1, radius: 12 });
  k.lamp(36, -29, '#ff4a3a', { radius: 10, flicker: 'flicker' });
  k.lamp(36, -12, '#ffe080', { intensity: 0.6, radius: 5 });
  k.lamp(-14, -21, '#ffb070', { radius: 8, flicker: 'broken' });
  k.lamp(-28, -21, '#60ff90', { intensity: 1.1, radius: 12, flicker: 'pulse' });

  k.thing('exit', -31.3, -21, { angle: 270 });
  return k.build();
}
