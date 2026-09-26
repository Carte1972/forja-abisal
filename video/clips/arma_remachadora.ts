import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'arma_remachadora',
  description: 'Remachadora: ráfaga continua y modo sobrecargado contra vigías sobre la sima.',
  level: 'level_02',
  duration: 5,
  hud: true,
  levelEnemies: false,
  loadout: { weapons: ['pistol', 'riveter'], ammo: { bullets: 200 }, weapon: 'riveter' },
  camera: {
    mode: 'player',
    start: { pos: [5, -9], yaw: 0, pitch: 12 },
    aim: [
      { enemy: 'uno', from: 0.4, to: 2.4 },
      { enemy: 'dos', from: 2.5, to: 4.6 },
    ],
  },
  actions: [
    { do: 'spawn', at: 0, name: 'uno', kind: 'watcher', pos: [3, -17], y: 2.5, yaw: 180 },
    { do: 'spawn', at: 0, name: 'dos', kind: 'watcher', pos: [8, -18], y: 3, yaw: 180 },
    { do: 'input', input: 'fire', at: 0.7, hold: 1.7 },
    { do: 'input', input: 'altFire', at: 2.8, hold: 1.8 },
  ],
};

export default clip;
