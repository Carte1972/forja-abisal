import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'enemigo_rastrero',
  description:
    'Un rastrero cruza el anillo de la sima a toda velocidad hacia la cámara y lanza un zarpazo.',
  level: 'level_02',
  duration: 3,
  levelEnemies: false,
  camera: {
    mode: 'free',
    playerFollows: true,
    path: {
      keys: [
        { t: 0, pos: [-6, 1.7, -9], look: [12, 0.8, -9] },
        { t: 3, pos: [-6.5, 1.65, -9], look: [12, 0.6, -9] },
      ],
    },
  },
  actions: [{ do: 'spawn', at: 0, name: 'rastrero', kind: 'crawler', pos: [9, -9], yaw: 90 }],
};

export default clip;
