import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'enemigo_centinela',
  description: 'Un centinela descubre la cámara y le dispara ráfagas.',
  level: 'level_01',
  duration: 4.5,
  levelEnemies: false,
  camera: {
    mode: 'free',
    playerFollows: true,
    path: {
      keys: [
        { t: 0, pos: [11.5, 1.7, -9.8], look: [15.5, 1.4, -13.5] },
        { t: 4.5, pos: [12, 1.65, -10.3], look: [15.5, 1.4, -13.5] },
      ],
    },
  },
  actions: [
    { do: 'spawn', at: 0, name: 'centinela', kind: 'sentinel', pos: [15.5, -13.5], yaw: 133 },
  ],
};

export default clip;
