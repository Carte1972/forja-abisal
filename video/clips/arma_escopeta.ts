import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'arma_escopeta',
  description:
    'Escopeta de dispersión: un cañón y los dos a la vez contra rastreros que se acercan.',
  level: 'level_01',
  duration: 5,
  hud: true,
  levelEnemies: false,
  loadout: { weapons: ['pistol', 'shotgun'], ammo: { bullets: 20, shells: 30 }, weapon: 'shotgun' },
  camera: {
    mode: 'player',
    start: { pos: [-1, -9.5], yaw: 0, pitch: -6 },
    aim: [
      { enemy: 'primero', from: 0.8, to: 1.6 },
      { enemy: 'segundo', from: 2.3, to: 3.6 },
    ],
  },
  actions: [
    { do: 'spawn', at: 0, name: 'primero', kind: 'crawler', pos: [-2, -17], yaw: 180 },
    { do: 'spawn', at: 1.4, name: 'segundo', kind: 'crawler', pos: [1, -18], yaw: 180 },
    { do: 'input', input: 'fire', at: 1.3 },
    { do: 'input', input: 'altFire', at: 3.05 },
  ],
};

export default clip;
