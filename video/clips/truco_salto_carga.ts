import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'truco_salto_carga',
  description: 'Salto con carga desde el anillo inferior de la sima hasta el anillo superior.',
  level: 'level_02',
  duration: 5,
  levelEnemies: false,
  loadout: { weapons: ['launcher'], ammo: { charges: 10 }, weapon: 'launcher' },
  warmup: 1,
  camera: {
    mode: 'player',
    start: { pos: [-1, -23], yaw: 90 },
    look: {
      easing: 'linear',
      keys: [
        { t: 0, yaw: 90, pitch: 8 },
        { t: 0.2, yaw: 90, pitch: -60 },
        { t: 0.3, yaw: 90, pitch: -88 },
        { t: 0.45, yaw: 90, pitch: -88 },
        { t: 1.1, yaw: 90, pitch: -10 },
        { t: 2.2, yaw: 90, pitch: -10 },
        { t: 5, yaw: -60, pitch: -22 },
      ],
    },
  },
  actions: [
    { do: 'input', input: 'forward', at: 0, hold: 1.2 },
    { do: 'input', input: 'jump', at: 0.3 },
    { do: 'input', input: 'fire', at: 0.33 },
  ],
};

export default clip;
