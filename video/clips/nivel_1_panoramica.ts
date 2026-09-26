import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'nivel_1_panoramica',
  description: 'Vuelo por la nave de Fundición Cero, sobre el canal de lava y hacia la galería.',
  level: 'level_01',
  duration: 10,
  camera: {
    mode: 'free',
    path: {
      keys: [
        { t: 0, pos: [-2, 6.5, -9], look: [14, 0, -20] },
        { t: 5, pos: [8, 6, -13], look: [12, 1.5, -25] },
        { t: 10, pos: [16, 5, -18.5], look: [2, 3, -24] },
      ],
    },
  },
};

export default clip;
