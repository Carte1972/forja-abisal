import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'cierre_rastrero',
  description: 'En el sótano, un rastrero levanta la cabeza, mira a cámara y se lanza contra ella.',
  level: 'level_01',
  duration: 1.4,
  levelEnemies: false,
  camera: {
    mode: 'free',
    playerFollows: true,
    path: {
      keys: [
        { t: 0, pos: [-9, -2.6, -12], look: [-13.5, -3.2, -18] },
        { t: 1.4, pos: [-8.9, -2.6, -11.9], look: [-10.5, -2.9, -14.5] },
      ],
    },
  },
  actions: [
    { do: 'spawn', at: 0, name: 'rastrero', kind: 'crawler', pos: [-13.5, -18], yaw: -145 },
  ],
};

export default clip;
