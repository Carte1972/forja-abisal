import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/core/rng';
import { WEAPONS } from './weapon_defs';
import {
  addAmmo,
  createWeaponState,
  cycleWeapon,
  giveWeapon,
  totalAmmo,
  updateWeapons,
  type WeaponEvent,
  type WeaponInput,
  type WeaponState,
} from './weapon_logic';

const DT = 1 / 60;
const IDLE: WeaponInput = { fire: false, alt: false, reload: false, select: null, cycle: 0 };

function step(
  state: WeaponState,
  input: Partial<WeaponInput> = {},
  seconds = DT,
  rng = new Rng(1),
) {
  const events: WeaponEvent[] = [];
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    events.push(...updateWeapons(state, { ...IDLE, ...input }, DT, rng));
  }
  return events;
}

const fires = (events: WeaponEvent[]) => events.filter((e) => e.type === 'fire');

function armed(overrides: Partial<Parameters<typeof createWeaponState>[0]> = {}) {
  return createWeaponState({
    weapons: ['pistol', 'shotgun', 'riveter', 'launcher'],
    ammo: { bullets: 100, shells: 20, charges: 10 },
    ...overrides,
  });
}

describe('estado inicial', () => {
  it('siempre tiene el martillo, llena los cargadores y saca la mejor arma no explosiva', () => {
    const state = armed();
    expect(state.owned.has('hammer')).toBe(true);
    expect(state.current).toBe('riveter');
    expect(state.magazines.pistol).toBe(12);
    expect(state.magazines.riveter).toBe(50);
    expect(state.ammo.bullets).toBe(100 - 12 - 50);
  });

  it('sin munición empieza con el martillo', () => {
    const state = createWeaponState({ weapons: ['pistol'], ammo: {} });
    expect(state.current).toBe('hammer');
  });
});

describe('disparo', () => {
  it('dispara, gasta munición y respeta la cadencia', () => {
    const state = armed();
    state.current = 'pistol';
    const events = step(state, { fire: true }, 1);
    // 0,28 s entre disparos: en 1 s caben 4 disparos (t = 0; 0,28; 0,56; 0,84).
    expect(fires(events)).toHaveLength(4);
    expect(state.magazines.pistol).toBe(8);
  });

  it('la escopeta dispara 8 perdigones dentro del cono de dispersión', () => {
    const state = armed();
    state.current = 'shotgun';
    const [shot] = fires(step(state, { fire: true }));
    expect(shot?.type === 'fire' && shot.shots).toHaveLength(8);
    if (shot?.type !== 'fire') throw new Error('sin disparo');
    for (const s of shot.shots) {
      expect(Math.hypot(s.yaw, s.pitch)).toBeLessThanOrEqual(WEAPONS.shotgun.primary.spread + 1e-9);
    }
  });

  it('la dispersión es determinista con la misma semilla', () => {
    const a = armed();
    const b = armed();
    a.current = b.current = 'shotgun';
    const ea = fires(step(a, { fire: true }, DT, new Rng(7)));
    const eb = fires(step(b, { fire: true }, DT, new Rng(7)));
    expect(ea).toEqual(eb);
  });

  it('el disparo alternativo de la escopeta gasta los dos cartuchos', () => {
    const state = armed();
    state.current = 'shotgun';
    const [shot] = fires(step(state, { alt: true }));
    expect(shot).toMatchObject({ mode: 'alt' });
    expect(state.magazines.shotgun).toBe(0);
  });

  it('con un solo cartucho, el alternativo dispara solo un cañón', () => {
    const state = armed();
    state.current = 'shotgun';
    state.magazines.shotgun = 1;
    const [shot] = fires(step(state, { alt: true }));
    expect(shot).toMatchObject({ mode: 'primary' });
  });

  it('la ráfaga de la pistola dispara tres balas con una pulsación', () => {
    const state = armed();
    state.current = 'pistol';
    const events = step(state, { alt: true }, DT);
    const all = [...events, ...step(state, {}, 0.3)];
    expect(fires(all)).toHaveLength(3);
    expect(state.magazines.pistol).toBe(9);
  });

  it('el martillo no gasta munición', () => {
    const state = createWeaponState({ weapons: [], ammo: {} });
    expect(fires(step(state, { fire: true }, 2)).length).toBeGreaterThan(3);
  });
});

describe('recarga', () => {
  it('recarga sola al vaciar el cargador y rellena desde la reserva', () => {
    const state = armed();
    state.current = 'shotgun';
    const events = [...step(state, { fire: true }, 0.6), ...step(state, { fire: true }, 0.1)];
    expect(state.magazines.shotgun).toBe(0);
    events.push(...step(state, {}, WEAPONS.shotgun.reloadTime + 0.1));
    expect(events.map((e) => e.type)).toEqual(['fire', 'fire', 'reloadStart', 'reloadEnd']);
    expect(state.magazines.shotgun).toBe(2);
    expect(state.ammo.shells).toBe(20 - 2 - 2);
  });

  it('no dispara mientras recarga', () => {
    const state = armed();
    state.current = 'shotgun';
    state.magazines.shotgun = 0;
    const events = step(state, { fire: true }, 1);
    expect(fires(events)).toHaveLength(0);
    expect(state.phase).toBe('reloading');
  });

  it('la recarga manual solo ocurre si falta munición y hay reserva', () => {
    const state = armed();
    state.current = 'pistol';
    expect(step(state, { reload: true })).toEqual([]);
    state.magazines.pistol = 5;
    expect(step(state, { reload: true })[0]).toMatchObject({ type: 'reloadStart' });
  });

  it('con poca reserva, la recarga es parcial', () => {
    const state = armed();
    state.current = 'pistol';
    state.magazines.pistol = 0;
    state.ammo.bullets = 3;
    step(state, {}, WEAPONS.pistol.reloadTime + 0.1);
    expect(state.magazines.pistol).toBe(3);
    expect(state.ammo.bullets).toBe(0);
  });
});

describe('sin munición', () => {
  it('hace clic en vacío y cambia sola a otra arma con munición', () => {
    const state = armed({ ammo: { bullets: 12 } });
    state.current = 'pistol';
    state.magazines.pistol = 0;
    state.magazines.riveter = 0;
    state.ammo.bullets = 0;
    const events = step(state, { fire: true });
    expect(events.map((e) => e.type)).toEqual(['dryFire', 'lower']);
    step(state, {}, 1);
    expect(state.current).toBe('hammer');
  });

  it('nunca cambia sola al lanzacargas', () => {
    const state = createWeaponState({ weapons: ['pistol', 'launcher'], ammo: { charges: 5 } });
    state.current = 'pistol';
    step(state, { fire: true });
    step(state, {}, 1);
    expect(state.current).toBe('hammer');
  });
});

describe('cambio de arma', () => {
  it('baja, sube la nueva y no dispara durante el cambio', () => {
    const state = armed();
    const events = step(state, { select: 'shotgun' });
    expect(events[0]).toMatchObject({ type: 'lower', from: 'riveter', to: 'shotgun' });
    expect(fires(step(state, { fire: true }, 0.2))).toHaveLength(0);
    step(state, {}, 1);
    expect(state.current).toBe('shotgun');
    expect(state.phase).toBe('ready');
  });

  it('ignora armas que no se tienen', () => {
    const state = createWeaponState({ weapons: ['pistol'], ammo: { bullets: 10 } });
    expect(step(state, { select: 'launcher' })).toEqual([]);
  });

  it('la rueda salta las armas que no se tienen y da la vuelta', () => {
    const state = createWeaponState({ weapons: ['pistol', 'launcher'], ammo: { bullets: 10 } });
    state.current = 'pistol';
    expect(cycleWeapon(state, 1)).toBe('launcher');
    state.current = 'launcher';
    expect(cycleWeapon(state, 1)).toBe('hammer');
    expect(cycleWeapon(state, -1)).toBe('pistol');
  });

  it('cambiar de arma cancela la recarga', () => {
    const state = armed();
    state.current = 'pistol';
    state.magazines.pistol = 0;
    step(state);
    expect(state.phase).toBe('reloading');
    step(state, { select: 'shotgun' });
    expect(state.phase).toBe('lowering');
  });
});

describe('munición y armas nuevas', () => {
  it('addAmmo respeta el máximo', () => {
    const state = armed();
    const room = 50 - state.ammo.shells;
    expect(addAmmo(state, 'shells', 1000)).toBe(room);
    expect(addAmmo(state, 'shells', 5)).toBe(0);
  });

  it('giveWeapon añade el arma con el cargador lleno una sola vez', () => {
    const state = createWeaponState({ weapons: [], ammo: { shells: 10 } });
    expect(giveWeapon(state, 'shotgun')).toBe(true);
    expect(giveWeapon(state, 'shotgun')).toBe(false);
    expect(totalAmmo(state, 'shotgun')).toBe(10);
    expect(state.magazines.shotgun).toBe(2);
  });
});
