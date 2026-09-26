import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'enemigo_vigia',
  description: 'Un vigía flota sobre el lago de lava, gira hacia la cámara y dispara descargas.',
  level: 'level_03',
  duration: 4.5,
  levelEnemies: false,
  camera: {
    mode: 'free',
    playerFollows: true,
    path: {
      keys: [
        { t: 0, pos: [-1, 1.7, -9.5], look: [-0.5, 2.8, -13.5] },
        { t: 4.5, pos: [-0.6, 1.7, -10.2], look: [-0.5, 3, -13.5] },
      ],
    },
  },
  actions: [
    { do: 'spawn', at: 0, name: 'vigia', kind: 'watcher', pos: [-0.5, -13.5], y: 2.6, yaw: 170 },
  ],
};

export default clip;
