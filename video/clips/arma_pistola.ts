import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'arma_pistola',
  description: 'Pistola de servicio: tiros precisos y ráfagas de tres contra un centinela lejano.',
  level: 'level_01',
  duration: 5,
  hud: true,
  levelEnemies: false,
  loadout: { weapons: ['pistol'], ammo: { bullets: 80 }, weapon: 'pistol' },
  camera: {
    mode: 'player',
    start: { pos: [-1, -9.5], yaw: 0 },
    look: { keys: [{ t: 0, look: [0, 1.3, -17] }] },
  },
  actions: [
    { do: 'spawn', at: 0, name: 'centinela', kind: 'sentinel', pos: [0, -17], yaw: 180 },
    { do: 'input', input: 'fire', at: 0.8 },
    { do: 'input', input: 'fire', at: 1.2 },
    { do: 'input', input: 'fire', at: 1.6 },
    { do: 'input', input: 'altFire', at: 2.4 },
    { do: 'input', input: 'altFire', at: 3.3 },
  ],
};

export default clip;
