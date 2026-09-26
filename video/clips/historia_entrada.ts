import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'historia_entrada',
  description:
    'El técnico sale de la sala de entrada y avanza por el pasillo hacia el resplandor de la fundición.',
  level: 'level_01',
  duration: 6,
  levelEnemies: false,
  camera: {
    mode: 'player',
    start: { pos: [6, 7], yaw: 0 },
    look: {
      keys: [
        { t: 0, yaw: 0, pitch: -2 },
        { t: 3, yaw: 0, pitch: 0 },
        { t: 6, yaw: 8, pitch: 10 },
      ],
    },
  },
  actions: [{ do: 'input', input: 'forward', at: 0.2, hold: 2.1 }],
};

export default clip;
