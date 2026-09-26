import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'historia_fundicion',
  description:
    'Travelling lento por la nave de la fundición, sobre el canal de lava, hacia la galería.',
  level: 'level_01',
  duration: 7,
  camera: {
    mode: 'free',
    path: {
      keys: [
        { t: 0, pos: [4, 1.8, -9.3], look: [8, 0, -18] },
        { t: 7, pos: [11, 2.8, -12.8], look: [7, 2.5, -24] },
      ],
    },
  },
};

export default clip;
