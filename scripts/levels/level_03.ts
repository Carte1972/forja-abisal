import { LevelKit, rect, type P } from './level_kit.ts';

/**
 * Nivel 3 — "Núcleo Abisal" (dificultad alta).
 *
 * Una caverna enorme con un lago de lava. Pasarelas de rejilla llevan de la orilla sur a una isla
 * central con una torre, a la que se sube en ascensor (llave roja arriba), y de la isla a la
 * orilla norte. Una escalera en el oeste del lago permite salir si se cae a la lava.
 * - Puerta roja (norte): armería con columnas y la llave azul (y un secreto).
 * - Puerta azul (norte): refrigeración; una escalera sube a una sala alta con un canal de ácido
 *   y la llave amarilla (y un secreto).
 * - Puerta amarilla (este de la orilla sur): sala de salida con una emboscada.
 */
export function level03(): Record<string, unknown> {
  const k = new LevelKit(
    'Núcleo Abisal',
    { floor: 'dirt', ceiling: 'rock', walls: 'rock' },
    {
      fog: { color: '#1a0a06', near: 14, far: 70 },
      ambient: { color: '#c89080', intensity: 0.75 },
    },
  );
  const lava = { type: 'damage', damagePerSecond: 25 };
  const cave = { height: 16, texture: 'rock' };

  // Entrada.
  k.room(0, 0, 8, 8, {
    id: 'entrada',
    floor: { height: 0, texture: 'metal_floor' },
    ceiling: { height: 4, texture: 'metal_ceiling' },
    walls: 'tech_wall',
    light: 0.7,
  });
  k.room(3, -6, 5, 0, {
    id: 'pasillo',
    floor: { height: 0, texture: 'metal_floor' },
    ceiling: { height: 3.5, texture: 'metal_ceiling' },
    walls: 'tech_wall',
    light: 0.5,
  });

  // Caverna: orillas sur y norte, lago de lava con la isla y escalera de escape.
  k.room(-20, -12, 28, -6, { id: 'orilla_sur', floor: { height: 0 }, ceiling: cave, light: 0.6 });
  k.room(-20, -46, 28, -40, {
    id: 'orilla_norte',
    floor: { height: 0 },
    ceiling: cave,
    light: 0.6,
  });
  k.sector(
    [
      [-14, -12],
      [28, -12],
      [28, -40],
      [-20, -40],
      [-20, -18],
      [-14, -18],
    ],
    {
      id: 'lago_lava',
      floor: { height: -2, texture: 'lava' },
      ceiling: cave,
      light: 0.95,
      special: lava,
      holes: [rect(-2, -32, 10, -20)],
    },
  );
  k.stairs(-20, -18, -14, -12, {
    dir: '+z',
    steps: 5,
    from: -2,
    to: 0,
    ceiling: 16,
    walls: { middle: 'rock', lower: 'stone_step' },
    id: 'escape_lava',
  });
  // Isla central con la torre y su ascensor.
  const towerNotch: P[] = [
    [1, -29],
    [7, -29],
    [7, -23],
    [5, -23],
    [5, -21],
    [3, -21],
    [3, -23],
    [1, -23],
  ];
  k.room(-2, -32, 10, -20, {
    id: 'isla',
    floor: { height: 0, texture: 'stone_floor' },
    ceiling: cave,
    light: 0.7,
    holes: [towerNotch],
  });
  k.room(1, -29, 7, -23, {
    id: 'torre',
    floor: { height: 6, texture: 'metal_grate' },
    ceiling: cave,
    walls: 'tech_wall',
    light: 0.7,
  });
  k.room(3, -23, 5, -21, {
    id: 'ascensor_torre',
    floor: { height: 6, texture: 'lift_top' },
    ceiling: cave,
    walls: 'tech_wall',
    special: { type: 'lift', lowHeight: 0, waitTime: 3 },
    light: 0.7,
  });
  // Pasarelas sobre la lava.
  k.slab(rect(3, -20, 5, -12), -0.4, 0, 'metal_grate');
  k.slab(rect(3, -40, 5, -32), -0.4, 0, 'metal_grate');
  k.slab(rect(10, -27, 22, -25), -0.4, 0, 'metal_grate');
  k.slab(rect(22, -40, 24, -25), -0.4, 0, 'metal_grate');

  // Puerta roja y armería.
  k.room(-12, -46.5, -10, -46, {
    id: 'puerta_roja',
    floor: { height: 0 },
    ceiling: { height: 3.5 },
    walls: 'door_frame',
    special: { type: 'door', key: 'red' },
  });
  k.room(-18, -58, -4, -46.5, {
    id: 'armeria',
    floor: { height: 0, texture: 'metal_floor' },
    ceiling: { height: 6, texture: 'metal_ceiling' },
    walls: 'brick',
    light: 0.55,
    holes: [
      rect(-15, -51, -14, -50),
      rect(-9, -51, -8, -50),
      rect(-15, -55, -14, -54),
      rect(-9, -55, -8, -54),
    ],
  });
  k.room(-18.5, -53, -18, -51, {
    id: 'pared_secreta_armeria',
    floor: { height: 0 },
    ceiling: { height: 3 },
    walls: 'brick',
    special: { type: 'door', hidden: true, waitTime: 0 },
  });
  k.room(-21.5, -54, -18.5, -50, {
    id: 'escondite_armeria',
    floor: { height: 0, texture: 'metal_floor' },
    ceiling: { height: 3, texture: 'metal_ceiling' },
    walls: 'brick',
    light: 0.35,
    secret: true,
  });

  // Puerta azul, refrigeración y sala alta con canal de ácido.
  k.room(20, -46.5, 22, -46, {
    id: 'puerta_azul',
    floor: { height: 0 },
    ceiling: { height: 3.5 },
    walls: 'door_frame',
    special: { type: 'door', key: 'blue' },
  });
  k.room(19, -52, 23, -46.5, {
    id: 'refrigeracion',
    floor: { height: 0, texture: 'metal_floor' },
    ceiling: { height: 4, texture: 'metal_ceiling' },
    walls: 'tech_wall',
    light: 0.5,
  });
  k.stairs(19, -60, 23, -52, {
    dir: '-z',
    steps: 10,
    from: 0,
    to: 4,
    headroom: 4,
    walls: { middle: 'tech_wall', lower: 'stone_step' },
  });
  k.room(12, -70, 30, -60, {
    id: 'sala_fria',
    floor: { height: 4, texture: 'metal_floor' },
    ceiling: { height: 10, texture: 'metal_ceiling' },
    walls: 'tech_wall',
    light: 0.6,
    holes: [rect(17, -67, 25, -63)],
  });
  k.room(17, -67, 25, -63, {
    id: 'canal_acido',
    floor: { height: 3, texture: 'acid' },
    ceiling: { height: 10, texture: 'metal_ceiling' },
    walls: 'tech_wall',
    light: 0.9,
    special: { type: 'damage', damagePerSecond: 15 },
  });
  k.room(14, -70.5, 16, -70, {
    id: 'pared_secreta_fria',
    floor: { height: 4 },
    ceiling: { height: 7 },
    walls: 'tech_wall',
    special: { type: 'door', hidden: true, waitTime: 0 },
  });
  k.room(13, -73.5, 17, -70.5, {
    id: 'escondite_frio',
    floor: { height: 4, texture: 'metal_floor' },
    ceiling: { height: 7, texture: 'metal_ceiling' },
    walls: 'tech_wall',
    light: 0.35,
    secret: true,
  });

  // Puerta amarilla y sala de salida.
  k.room(28, -10, 28.5, -8, {
    id: 'puerta_amarilla',
    floor: { height: 0 },
    ceiling: { height: 3.5 },
    walls: 'door_frame',
    special: { type: 'door', key: 'yellow' },
  });
  k.room(28.5, -14, 40, -4, {
    id: 'sala_salida',
    floor: { height: 0, texture: 'metal_floor' },
    ceiling: { height: 5, texture: 'metal_ceiling' },
    walls: 'tech_wall',
    light: 0.6,
    holes: [rect(33, -10, 35, -8)],
  });

  k.thing('player_start', 4, 6.5, {
    angle: 0,
    weapons: ['pistol', 'shotgun', 'riveter'],
    ammo: { bullets: 120, shells: 24 },
  });

  // Enemigos: orillas y lago.
  k.enemy('crawler', -10, -9, 0);
  k.enemy('crawler', 14, -9, 0);
  k.enemy('crawler', 22, -8, 0);
  k.enemy('sentinel', -16, -8, 0, { patrol: [[-4, -8]] });
  k.enemy('sentinel', 25, -11, 0);
  k.enemy('watcher', -6, -26, 180);
  k.enemy('watcher', 16, -18, 180);
  k.enemy('watcher', 16, -34, 180);
  k.enemy('watcher', -12, -34, 180);
  k.enemy('sentinel', 0, -31, 180);
  k.enemy('sentinel', 8.5, -30.5, 180);
  k.enemy('sentinel', 2, -28, 180, { y: 6 });
  k.enemy('sentinel', 6, -24, 180, { y: 6 });
  k.enemy('spitter', -14, -43, 180);
  k.enemy('spitter', 14, -43, 180);
  k.enemy('sentinel', 25, -43, 180);
  // Armería.
  k.enemy('crawler', -11, -52.5, 180);
  k.enemy('crawler', -6, -56, 180);
  k.enemy('crawler', -16, -56.5, 180);
  k.enemy('crawler', -6, -49, 180);
  k.enemy('spitter', -11, -56.5, 180);
  k.enemy('sentinel', -16, -48, 90);
  // Refrigeración y sala fría.
  k.enemy('sentinel', 21, -49, 0);
  k.enemy('crawler', 14, -61.5, 90);
  k.enemy('crawler', 28, -61.5, 270);
  k.enemy('spitter', 14, -68, 0);
  k.enemy('spitter', 28, -68, 0);
  k.enemy('watcher', 21, -65, 0);
  k.enemy('sentinel', 26, -69, 0);
  // Sala de salida: emboscada.
  k.enemy('crawler', 37, -12, 90);
  k.enemy('crawler', 37, -6, 90);
  k.enemy('spitter', 38.5, -9, 90);
  k.enemy('sentinel', 31, -12.5, 90);
  k.enemy('watcher', 36, -9, 90);

  // Objetos.
  k.pickup('health', 1, 1);
  k.pickup('armor_small', 7, 1);
  k.pickup('ammo_shells', -18, -7);
  k.pickup('ammo_bullets', 26, -7);
  k.pickup('health', -19, -11);
  k.pickup('health_large', -1, -21);
  k.pickup('ammo_shells', 9, -21);
  k.pickup('key_red', 4, -26, { y: 6 });
  k.pickup('armor', 2, -24, { y: 6 });
  k.pickup('ammo_bullets', -18, -42);
  k.pickup('health', 26, -42);
  k.pickup('weapon_launcher', 23, -33, { y: 0 });
  k.pickup('ammo_charges', 23, -30, { y: 0 });
  k.pickup('key_blue', -16.5, -57);
  k.pickup('ammo_shells', -5, -57);
  k.pickup('health_large', -5, -47.5);
  k.pickup('armor', -20, -52);
  k.pickup('ammo_charges', -20.5, -51);
  k.pickup('health_large', -19.5, -53);
  k.pickup('ammo_bullets', 22, -50);
  k.pickup('key_yellow', 28.5, -69);
  k.pickup('health', 13, -61);
  k.pickup('ammo_charges', 29, -61);
  k.pickup('ammo_shells', 13, -69);
  k.pickup('armor', 15, -72);
  k.pickup('health_large', 15, -71.5);
  k.pickup('ammo_bullets', 14, -72.5);
  k.pickup('health', 30, -5);
  k.pickup('ammo_shells', 30, -13);

  // Luces.
  k.lamp(4, 4, '#ffe0b0', { radius: 8 });
  k.lamp(4, -3, '#ff8040', { radius: 7, flicker: 'broken' });
  k.lamp(-8, -26, '#ff5020', { intensity: 1.6, radius: 18, flicker: 'pulse', y: 1 });
  k.lamp(18, -18, '#ff6030', { intensity: 1.6, radius: 18, flicker: 'flicker', y: 1 });
  k.lamp(18, -34, '#ff5020', { intensity: 1.4, radius: 16, flicker: 'pulse', y: 1 });
  k.lamp(4, -26, '#ffd6a0', { intensity: 1.2, radius: 14, shadows: true, y: 11 });
  k.lamp(-10, -9, '#ffb070', { radius: 10 });
  k.lamp(16, -43, '#ffb070', { radius: 10 });
  k.lamp(-11, -52, '#ff4a3a', { intensity: 1.1, radius: 12, flicker: 'strobe' });
  k.lamp(-20, -52, '#ffe080', { intensity: 0.6, radius: 5 });
  k.lamp(21, -49, '#60e0ff', { radius: 8 });
  k.lamp(21, -65, '#80ff60', { intensity: 1.3, radius: 14, flicker: 'pulse' });
  k.lamp(15, -72, '#ffe080', { intensity: 0.6, radius: 5 });
  k.lamp(34, -6, '#ff4a3a', { radius: 10, flicker: 'flicker' });
  k.lamp(34, -12, '#60ff90', { radius: 10, flicker: 'pulse' });

  k.thing('exit', 39.3, -9, { angle: 90 });
  return k.build();
}
