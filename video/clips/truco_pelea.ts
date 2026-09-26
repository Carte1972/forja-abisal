import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'truco_pelea',
  description: 'Un escupidor alcanza por error a un centinela y los dos se enfrentan.',
  level: 'level_01',
  duration: 7,
  levelEnemies: false,
  camera: {
    mode: 'free',
    path: {
      keys: [
        { t: 0, pos: [3.5, 2, -14.8], look: [-2, 1, -14.8] },
        { t: 7, pos: [3, 1.95, -14.6], look: [-2, 1, -14.8] },
      ],
    },
  },
  actions: [
    { do: 'spawn', at: 0, name: 'escupidor', kind: 'spitter', pos: [-2, -18], yaw: 180 },
    { do: 'spawn', at: 0, name: 'centinela', kind: 'sentinel', pos: [-2, -11.5], yaw: 0 },
    { do: 'provoke', at: 0.4, attacker: 'escupidor', victim: 'centinela' },
  ],
};

export default clip;
