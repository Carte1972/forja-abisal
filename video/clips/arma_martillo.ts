import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'arma_martillo',
  description: 'Martillo de pistón: golpe rápido y golpe cargado contra un rastrero.',
  level: 'level_01',
  duration: 5,
  hud: true,
  levelEnemies: false,
  loadout: { weapons: ['pistol'], ammo: { bullets: 60 }, weapon: 'hammer' },
  camera: {
    mode: 'player',
    start: { pos: [-1, -9.5], yaw: 0, pitch: -6 },
    look: {
      keys: [
        { t: 0, yaw: 0, pitch: -6 },
        { t: 0.8, yaw: 0, pitch: -8 },
        { t: 1.15, yaw: 0, pitch: -30 },
        { t: 5, yaw: 0, pitch: -26 },
      ],
    },
  },
  actions: [
    { do: 'spawn', at: 0, name: 'rastrero', kind: 'crawler', pos: [-1, -16], yaw: 180 },
    { do: 'input', input: 'fire', at: 1.1, hold: 0.5 },
    { do: 'input', input: 'altFire', at: 2.1, hold: 0.4 },
  ],
};

export default clip;
