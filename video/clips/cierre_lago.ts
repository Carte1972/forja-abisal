import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'cierre_lago',
  description:
    'La cámara se aleja despacio del lago de lava y sube hacia la oscuridad de la caverna.',
  level: 'level_03',
  duration: 8,
  camera: {
    mode: 'free',
    path: {
      keys: [
        { t: 0, pos: [4, 2, -14.5], look: [4, 3.5, -26] },
        { t: 8, pos: [4, 11, -6.8], look: [4, 1.5, -26] },
      ],
    },
  },
};

export default clip;
