import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'enemigo_escupidor',
  description: 'Un escupidor lanza bolas de ácido en parábola; se ven de lado.',
  level: 'level_02',
  duration: 5,
  levelEnemies: false,
  fov: 80,
  camera: {
    mode: 'free',
    playerAt: [-5, -9],
    path: {
      keys: [
        { t: 0, pos: [6.5, 2, -15.5], look: [6.5, 1, -9] },
        { t: 5, pos: [6, 2, -15.2], look: [6, 1, -9] },
      ],
    },
  },
  actions: [{ do: 'spawn', at: 0, name: 'escupidor', kind: 'spitter', pos: [11, -9], yaw: 90 }],
};

export default clip;
