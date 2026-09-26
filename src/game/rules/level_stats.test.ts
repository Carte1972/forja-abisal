import { describe, expect, it } from 'vitest';
import { formatTime, LevelStats } from './level_stats';

describe('LevelStats', () => {
  it('calcula porcentajes redondeados y 100 % si no hay nada que contar', () => {
    const stats = new LevelStats(3, 0, 4);
    stats.kills = 2;
    stats.secrets = 1;
    stats.time = 75.8;
    expect(stats.summary()).toMatchObject({ kills: 67, items: 100, secrets: 25, time: 75.8 });
    expect(stats.summary().counts.kills).toEqual([2, 3]);
  });

  it('formatTime da minutos y segundos', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(75.8)).toBe('1:15');
    expect(formatTime(600)).toBe('10:00');
  });
});
