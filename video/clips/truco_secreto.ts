import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'truco_secreto',
  description:
    'El jugador pulsa E en la pared sur del sótano, la pared sube y aparece el escondite con el blindaje.',
  level: 'level_01',
  duration: 7,
  hud: true,
  levelEnemies: false,
  loadout: { weapons: ['pistol'], ammo: { bullets: 60 }, weapon: 'pistol' },
  camera: {
    mode: 'player',
    start: { pos: [-11, -14.5], yaw: 180 },
    look: {
      keys: [
        { t: 0, yaw: 180, pitch: 0 },
        { t: 2.6, yaw: 180, pitch: 0 },
        { t: 3.4, yaw: 180, pitch: -18 },
        { t: 7, yaw: 180, pitch: -12 },
      ],
    },
  },
  actions: [
    { do: 'input', input: 'forward', at: 0.2, hold: 0.45 },
    { do: 'input', input: 'use', at: 1.2 },
    { do: 'input', input: 'forward', at: 4, hold: 0.28 },
  ],
};

export default clip;
