import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'nivel_3_panoramica',
  description: 'Vuelo sobre el lago de lava del Núcleo Abisal, rodeando la torre de la isla.',
  level: 'level_03',
  duration: 10,
  camera: {
    mode: 'free',
    path: {
      keys: [
        { t: 0, pos: [-12, 2.5, -14], look: [4, 4, -26] },
        { t: 5, pos: [0, 5, -15.5], look: [4, 4, -26] },
        { t: 10, pos: [13, 7.5, -18], look: [4, 5, -26] },
      ],
    },
  },
};

export default clip;
