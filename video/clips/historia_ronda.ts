import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'historia_ronda',
  description: 'Un centinela hace su ronda por la galería elevada, de espaldas a la cámara.',
  level: 'level_01',
  duration: 7,
  levelEnemies: false,
  camera: {
    mode: 'free',
    path: {
      keys: [
        { t: 0, pos: [-3, 4.7, -23.4], look: [8, 4.2, -24] },
        { t: 7, pos: [1.5, 4.6, -23.6], look: [12, 4.2, -24] },
      ],
    },
  },
  actions: [
    {
      do: 'spawn',
      at: 0,
      name: 'guardia',
      kind: 'sentinel',
      pos: [1.5, -24],
      yaw: -90,
      patrol: [[17, -24]],
    },
  ],
};

export default clip;
