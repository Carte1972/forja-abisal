import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'arma_lanzacargas',
  description: 'Lanzacargas: una carga explosiva contra un grupo y una carga rebotadora.',
  level: 'level_02',
  duration: 6,
  hud: true,
  levelEnemies: false,
  loadout: {
    weapons: ['pistol', 'launcher'],
    ammo: { bullets: 20, charges: 12 },
    weapon: 'launcher',
  },
  camera: {
    mode: 'player',
    start: { pos: [-7, -9], yaw: -90 },
    look: {
      keys: [
        { t: 0, look: [2, 0.6, -9] },
        { t: 2.4, look: [2, 0.4, -9] },
        { t: 3, look: [3, 0.3, -7.5] },
        { t: 6, look: [3, 0.9, -7.5] },
      ],
    },
    aim: [{ enemy: 'c', from: 2.6, to: 3.3 }],
  },
  actions: [
    { do: 'spawn', at: 0, name: 'a', kind: 'sentinel', pos: [1, -8], yaw: 90 },
    { do: 'spawn', at: 0, name: 'b', kind: 'crawler', pos: [2.5, -10], yaw: 90 },
    { do: 'spawn', at: 0, name: 'c', kind: 'sentinel', pos: [3, -7.5], yaw: 90 },
    { do: 'spawn', at: 0, name: 'd', kind: 'crawler', pos: [6, -9], yaw: 90 },
    { do: 'input', input: 'fire', at: 0.9 },
    { do: 'input', input: 'altFire', at: 3.1 },
  ],
};

export default clip;
