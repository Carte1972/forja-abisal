import { describe, expect, it } from 'vitest';
import { LEVELS } from '../levels/index';
import { initialLevelIndex, levelAt, nextLevelIndex } from './campaign';

describe('campaña', () => {
  it('empieza en el primer nivel salvo que la URL diga otra cosa', () => {
    expect(initialLevelIndex('')).toBe(0);
    expect(initialLevelIndex('?nivel=2')).toBe(1);
    expect(initialLevelIndex('?nivel=99')).toBe(0);
    expect(initialLevelIndex('?nivel=abc')).toBe(0);
    expect(initialLevelIndex('?nivel=prueba')).toBe(-1);
  });

  it('encadena los niveles y termina tras el último', () => {
    expect(nextLevelIndex(0)).toBe(1);
    expect(nextLevelIndex(LEVELS.length - 1)).toBeNull();
    expect(nextLevelIndex(-1)).toBeNull();
    expect(levelAt(-1).id).toBe('test_level');
  });

  it('hay tres niveles en la campaña', () => {
    expect(LEVELS).toHaveLength(3);
  });
});
