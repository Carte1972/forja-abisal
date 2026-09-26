import { describe, expect, it } from 'vitest';
import { PlayerHealth } from './player_health';

describe('PlayerHealth', () => {
  it('pierde salud y muere a 0 sin bajar de ahí', () => {
    const h = new PlayerHealth();
    expect(h.takeDamage(30)).toBe(30);
    expect(h.health).toBe(70);
    expect(h.takeDamage(500)).toBe(70);
    expect(h.health).toBe(0);
    expect(h.alive).toBe(false);
    expect(h.takeDamage(10)).toBe(0);
  });

  it('la armadura absorbe un tercio del daño mientras quede', () => {
    const h = new PlayerHealth();
    h.armor = 5;
    h.takeDamage(30);
    expect(h.armor).toBe(0);
    expect(h.health).toBe(75);
  });

  it('reset devuelve la salud máxima', () => {
    const h = new PlayerHealth();
    h.takeDamage(99);
    h.reset();
    expect(h.health).toBe(100);
  });
});
