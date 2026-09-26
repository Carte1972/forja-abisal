import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'controles_recorrido',
  description: 'Con el HUD: el jugador anda, salta, se agacha y abre la puerta roja con E.',
  level: 'level_01',
  duration: 7,
  hud: true,
  levelEnemies: false,
  loadout: { weapons: ['pistol'], ammo: { bullets: 60 }, weapon: 'pistol', keys: ['red'] },
  camera: { mode: 'player', start: { pos: [11, -11], yaw: -90 } },
  actions: [
    { do: 'input', input: 'forward', at: 0.2, hold: 0.9 },
    { do: 'input', input: 'jump', at: 0.5 },
    { do: 'input', input: 'crouch', at: 1.3, hold: 1 },
    { do: 'input', input: 'forward', at: 1.4, hold: 0.8 },
    { do: 'input', input: 'use', at: 2.6 },
    { do: 'input', input: 'forward', at: 4, hold: 1.2 },
  ],
};

export default clip;
