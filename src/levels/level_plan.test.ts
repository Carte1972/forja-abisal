import { describe, expect, it } from 'vitest';
import { parseLevel } from '../engine/level/level_parser';
import { LEVELS } from './index';
import { buildLevelPlanSvg } from './level_plan';

const count = (text: string, fragment: string) => text.split(fragment).length - 1;

describe('plano SVG de los niveles', () => {
  it.each(LEVELS.map((entry) => [entry.name, entry] as const))(
    '%s: muestra inicio, las tres llaves, la salida y los secretos',
    (_name, entry) => {
      const level = parseLevel(entry.data);
      const svg = buildLevelPlanSvg(level, { labels: {} });
      expect(svg.startsWith('<svg ')).toBe(true);
      expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
      expect(svg).toContain(level.name.toUpperCase());
      expect(count(svg, '>inicio</text>')).toBe(1);
      for (const color of ['#ff4030', '#3a80ff', '#ffd020']) {
        expect(svg).toContain(`r="6" fill="${color}"`);
      }
      expect(count(svg, 'fill="#60ff90"')).toBe(
        level.things.filter((t) => t.type === 'exit').length,
      );
      expect(count(svg, '>secreto</text>')).toBe(level.sectors.filter((s) => s.secret).length);
      expect(svg).not.toContain('NaN');
    },
  );

  it('rotula las salas con su nombre y respeta la posición y el tamaño indicados', () => {
    const level = parseLevel(LEVELS[0]!.data);
    const svg = buildLevelPlanSvg(level, {
      labels: { fundicion: 'fundición', patio: { text: 'patio & <cielo>', at: [0, 0], size: 9 } },
    });
    expect(svg).toContain('>fundición</text>');
    expect(svg).toContain('font-size="9"');
    expect(svg).toContain('>patio &amp; &lt;cielo&gt;</text>');
    expect(svg).not.toContain('>entrada</text>');
  });
});
