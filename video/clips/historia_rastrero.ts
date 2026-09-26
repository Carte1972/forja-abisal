import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'historia_rastrero',
  description: 'En la penumbra del sótano, un rastrero cruza despacio por delante de la cámara.',
  level: 'level_01',
  duration: 6,
  levelEnemies: false,
  camera: {
    mode: 'free',
    path: {
      keys: [
        { t: 0, pos: [-9.5, -2.5, -11], look: [-12, -3.3, -15.5] },
        { t: 6, pos: [-9.8, -2.55, -11.4], look: [-11.5, -3.3, -16] },
      ],
    },
  },
  actions: [
    {
      do: 'spawn',
      at: 0,
      name: 'sombra',
      kind: 'crawler',
      pos: [-15, -12],
      yaw: -135,
      patrol: [[-8, -18.5]],
    },
  ],
};

export default clip;
