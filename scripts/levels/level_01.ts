import { LevelKit, rect } from './level_kit.ts';

/**
 * Nivel 1 — "Fundición Cero" (dificultad baja).
 *
 * Sala de entrada → pasillo → gran fundición con un canal de lava cruzado por un puente.
 * Por el oeste, un ascensor baja al sótano (llave roja y un secreto). Por el este, la puerta roja
 * lleva a la sala de control (llave azul). Una escalera sube a la galería norte; la puerta azul
 * da a una rampa que baja al patio exterior, donde una escalera sube a la plataforma de la llave
 * amarilla (y a un secreto). La puerta amarilla lleva a la sala de salida.
 */
export function level01(): Record<string, unknown> {
  const k = new LevelKit(
    'Fundición Cero',
    { floor: 'metal_floor', ceiling: 'metal_ceiling', walls: 'tech_wall' },
    {
      fog: { color: '#1c120d', near: 16, far: 80 },
      sky: { top: '#1a0f1e', horizon: '#8a3a18', bottom: '#1c120d', clouds: 0.45 },
      ambient: { color: '#d0b8a0', intensity: 0.85 },
    },
  );

  // Sala de entrada con dos columnas.
  k.room(0, 0, 12, 10, {
    id: 'entrada',
    floor: { height: 0, texture: 'stone_floor' },
    ceiling: { height: 5 },
    walls: 'brick',
    light: 0.75,
    holes: [rect(3, 4, 4, 5), rect(8, 4, 9, 5)],
  });
  // Pasillo hacia la fundición.
  k.room(4, -8, 8, 0, {
    id: 'pasillo',
    floor: { height: 0 },
    ceiling: { height: 3.5 },
    light: 0.55,
  });

  // Fundición: gran nave con el canal de lava en el centro y la escalera en la esquina noreste.
  k.sector(
    [
      [-4, -8],
      [20, -8],
      [20, -14],
      [16, -14],
      [16, -22],
      [-4, -22],
    ],
    {
      id: 'fundicion',
      floor: { height: 0 },
      ceiling: { height: 9 },
      light: 0.6,
      holes: [rect(2, -20, 14, -16)],
    },
  );
  const lava = { type: 'damage', damagePerSecond: 20 };
  k.room(2, -20, 7, -16, {
    id: 'lava_oeste',
    floor: { height: -1, texture: 'lava' },
    ceiling: { height: 9 },
    walls: 'rock',
    light: 0.9,
    special: lava,
  });
  k.room(7, -20, 9, -16, {
    id: 'puente',
    floor: { height: 0, texture: 'metal_grate' },
    ceiling: { height: 9 },
    light: 0.7,
  });
  k.room(9, -20, 14, -16, {
    id: 'lava_este',
    floor: { height: -1, texture: 'lava' },
    ceiling: { height: 9 },
    walls: 'rock',
    light: 0.9,
    special: lava,
  });
  k.stairs(16, -22, 20, -14, {
    dir: '-z',
    steps: 12,
    from: 0,
    to: 3,
    ceiling: 9,
    id: 'escalera_galeria',
  });
  // Galería elevada sobre la fundición.
  k.room(-4, -26, 20, -22, {
    id: 'galeria',
    floor: { height: 3 },
    ceiling: { height: 9 },
    light: 0.55,
  });

  // Ascensor al sótano (oeste de la fundición) y sótano.
  k.room(-6, -16, -4, -14, {
    id: 'ascensor_sotano',
    floor: { height: 0, texture: 'lift_top' },
    ceiling: { height: 5 },
    special: { type: 'lift', lowHeight: -4 },
    light: 0.6,
  });
  k.room(-16, -20, -6, -10, {
    id: 'sotano',
    floor: { height: -4, texture: 'stone_floor' },
    ceiling: { height: -0.5, texture: 'metal_ceiling' },
    walls: 'rock',
    light: 0.45,
  });
  // Secreto 1: pared falsa en el sur del sótano.
  k.room(-12, -10, -10, -9.5, {
    id: 'pared_secreta_sotano',
    floor: { height: -4 },
    ceiling: { height: -1.5, texture: 'metal_ceiling' },
    walls: 'rock',
    special: { type: 'door', hidden: true, waitTime: 0 },
    light: 0.45,
  });
  k.room(-13, -9.5, -9, -6.5, {
    id: 'escondite_sotano',
    floor: { height: -4, texture: 'stone_floor' },
    ceiling: { height: -1.5 },
    walls: 'rock',
    light: 0.35,
    secret: true,
  });

  // Puerta roja y sala de control.
  k.room(20, -12, 20.5, -10, {
    id: 'puerta_roja',
    floor: { height: 0 },
    ceiling: { height: 3 },
    walls: 'door_frame',
    special: { type: 'door', key: 'red' },
  });
  k.room(20.5, -16, 30, -4, {
    id: 'control',
    floor: { height: 0 },
    ceiling: { height: 5 },
    light: 0.7,
    holes: [rect(24, -11, 26, -9)],
  });

  // Puerta azul en la galería y rampa que baja al patio.
  k.room(8, -26.5, 12, -26, {
    id: 'puerta_azul',
    floor: { height: 3 },
    ceiling: { height: 6 },
    walls: 'door_frame',
    special: { type: 'door', key: 'blue' },
  });
  k.room(8, -32, 12, -26.5, {
    id: 'rampa_patio',
    floor: {
      height: 3,
      texture: 'metal_floor',
      slope: { from: [10, -26.5], to: [10, -32], toHeight: 0 },
    },
    ceiling: { height: 14, sky: true },
    walls: 'rock',
    light: 0.95,
  });

  // Patio exterior con la plataforma de la llave amarilla y su escalera.
  const sky = { height: 14, sky: true };
  k.sector(
    [
      [0, -32],
      [24, -32],
      [24, -44],
      [11, -44],
      [11, -40],
      [6, -40],
      [6, -38],
      [0, -38],
    ],
    { id: 'patio', floor: { height: 0, texture: 'dirt' }, ceiling: sky, walls: 'rock', light: 1 },
  );
  k.stairs(6, -44, 11, -40, {
    dir: '-x',
    steps: 6,
    from: 0,
    to: 2.5,
    sky: true,
    ceiling: 14,
    walls: { middle: 'rock', lower: 'stone_step' },
  });
  k.room(0, -44, 6, -38, {
    id: 'plataforma',
    floor: { height: 2.5, texture: 'stone_floor' },
    ceiling: sky,
    walls: 'rock',
    light: 1,
  });
  // Secreto 2: pared falsa al oeste de la plataforma.
  k.room(-1, -42.5, 0, -40.5, {
    id: 'pared_secreta_patio',
    floor: { height: 2.5 },
    ceiling: { height: 5.5, texture: 'metal_ceiling' },
    walls: 'rock',
    special: { type: 'door', hidden: true, waitTime: 0 },
  });
  k.room(-4, -43, -1, -40, {
    id: 'escondite_patio',
    floor: { height: 2.5, texture: 'stone_floor' },
    ceiling: { height: 5.5 },
    walls: 'rock',
    light: 0.4,
    secret: true,
  });

  // Puerta amarilla y sala de salida.
  k.room(24, -40, 24.5, -37, {
    id: 'puerta_amarilla',
    floor: { height: 0 },
    ceiling: { height: 3.5 },
    walls: 'door_frame',
    special: { type: 'door', key: 'yellow' },
  });
  k.room(24.5, -42, 32, -35, {
    id: 'salida',
    floor: { height: 0 },
    ceiling: { height: 4 },
    light: 0.8,
  });

  // Jugador.
  k.thing('player_start', 6, 8, { angle: 0, weapons: ['pistol'], ammo: { bullets: 50 } });

  // Enemigos.
  k.enemy('sentinel', 0, -11, 180, { patrol: [[12, -11]] });
  k.enemy('sentinel', 14, -10, 180);
  k.enemy('crawler', 5, -21.2, 180);
  k.enemy('sentinel', 0, -24, 180, { patrol: [[14, -24]] });
  k.enemy('crawler', -10, -15, 90);
  k.enemy('crawler', -14, -12, 90);
  k.enemy('spitter', 27, -13, 90);
  k.enemy('sentinel', 22, -6, 90);
  k.enemy('sentinel', 18, -36, 0);
  k.enemy('sentinel', 4, -35, 0, { patrol: [[14, -35]] });
  k.enemy('crawler', 20, -42, 90);
  k.enemy('watcher', 12, -38, 0);
  k.enemy('crawler', 30, -40, 90);

  // Objetos.
  k.pickup('ammo_bullets', 10.5, 1.2);
  k.pickup('health', 1.5, 1.2);
  k.pickup('weapon_shotgun', 10, -10);
  k.pickup('ammo_shells', -2.5, -20.5);
  k.pickup('key_red', -14.5, -18.5);
  k.pickup('health', -8, -19);
  k.pickup('ammo_shells', -15, -11);
  k.pickup('armor', -11, -8);
  k.pickup('health_large', -12, -7.5);
  k.pickup('key_blue', 28.5, -5.5);
  k.pickup('ammo_bullets', 29, -15);
  k.pickup('health_large', 21.5, -15);
  k.pickup('armor_small', 22, -5);
  k.pickup('armor_small', 23, -5);
  k.pickup('ammo_shells', 18.5, -24);
  k.pickup('health', 22.5, -33.5);
  k.pickup('ammo_bullets', 1.5, -33.5);
  k.pickup('armor', 22.5, -43);
  k.pickup('key_yellow', 2, -42);
  k.pickup('weapon_riveter', -2.5, -41.5);
  k.pickup('ammo_bullets', -2.5, -42.5);
  k.pickup('health', 30, -36);

  // Luces.
  k.lamp(6, 5, '#ffd2a0', { intensity: 1.1, radius: 12, shadows: true });
  k.lamp(6, -4, '#ffc080', { radius: 8, flicker: 'flicker' });
  k.lamp(4, -12, '#ff9a50', { intensity: 1.2, radius: 14, flicker: 'flicker' });
  k.lamp(13, -12, '#ffb070', { intensity: 1.2, radius: 14 });
  k.lamp(8, -18, '#ff5020', { intensity: 1.3, radius: 12, flicker: 'pulse' });
  k.lamp(8, -24, '#a0b8ff', { radius: 12 });
  k.lamp(-11, -15, '#8ab4ff', { radius: 10, flicker: 'broken' });
  k.lamp(-11, -8, '#60ff90', { intensity: 0.6, radius: 5, flicker: 'pulse' });
  k.lamp(25, -7, '#60e0ff', { radius: 10 });
  k.lamp(25, -14, '#ff4a3a', { radius: 9, flicker: 'strobe' });
  k.lamp(16, -36, '#ffd6a0', { intensity: 1.2, radius: 14, shadows: true });
  k.lamp(-2.5, -41.5, '#ffe080', { intensity: 0.7, radius: 5 });
  k.lamp(28, -38.5, '#60ff90', { radius: 9, flicker: 'pulse' });

  k.thing('exit', 31.3, -38.5, { angle: 90 });
  return k.build();
}
