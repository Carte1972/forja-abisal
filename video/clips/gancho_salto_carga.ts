import type { ClipDefinition } from '../../src/recording/clip_types';

const clip: ClipDefinition = {
  id: 'gancho_salto_carga',
  description:
    'Salto con carga sobre el lago de lava del Núcleo Abisal: el jugador corre hasta el borde de la orilla, salta, dispara el lanzacargas al suelo, vuela sobre la lava y aterriza en lo alto de la torre.',
  level: 'level_03',
  duration: 5,
  loadout: { weapons: ['launcher'], ammo: { charges: 10 }, weapon: 'launcher' },
  warmup: 1,
  camera: {
    mode: 'player',
    start: { pos: [9, -7.5], yaw: 18 },
    look: {
      easing: 'linear',
      keys: [
        { t: 0, yaw: 18, pitch: -4 },
        { t: 0.3, yaw: 18, pitch: -8 },
        { t: 0.38, yaw: 18, pitch: -88 },
        { t: 0.5, yaw: 18, pitch: -88 },
        { t: 1.1, yaw: 16, pitch: -22 },
        { t: 1.45, yaw: 14, pitch: -8 },
        { t: 5, yaw: -62, pitch: -14 },
      ],
    },
  },
  actions: [
    { do: 'input', input: 'forward', at: 0, hold: 1.42 },
    { do: 'input', input: 'run', at: 0, hold: 1.42 },
    { do: 'input', input: 'jump', at: 0.4 },
    { do: 'input', input: 'fire', at: 0.43 },
  ],
};

export default clip;
