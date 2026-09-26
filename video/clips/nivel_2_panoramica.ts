import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'nivel_2_panoramica',
  description:
    'La sima de Pozos de Ceniza vista desde el anillo superior, bajando hacia el pozo de ácido.',
  level: 'level_02',
  duration: 10,
  camera: {
    mode: 'free',
    path: {
      keys: [
        { t: 0, pos: [5, 5, -5], look: [5, 5, -40] },
        { t: 4, pos: [5, 4, -12], look: [5, -3, -30] },
        { t: 10, pos: [4, 0, -17.5], look: [6, -6, -24] },
      ],
    },
  },
};

export default clip;
