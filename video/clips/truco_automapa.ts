import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'truco_automapa',
  description:
    'El jugador abre el automapa con Tab mientras avanza hacia la fundición; el plano se va completando.',
  level: 'level_01',
  duration: 6,
  hud: true,
  levelEnemies: false,
  loadout: { weapons: ['pistol'], ammo: { bullets: 60 }, weapon: 'pistol' },
  camera: {
    mode: 'player',
    start: { pos: [6, 4], yaw: 0 },
    look: {
      keys: [
        { t: 0, yaw: 0, pitch: 0 },
        { t: 3.5, yaw: 0, pitch: 0 },
        { t: 6, yaw: -50, pitch: 0 },
      ],
    },
  },
  actions: [
    { do: 'input', input: 'automap', at: 0.6 },
    { do: 'input', input: 'forward', at: 0.3, hold: 2.1 },
  ],
};

export default clip;
