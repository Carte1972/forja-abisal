import { describe, expect, it } from 'vitest';
import { buildTimeline, frameCount, stepAt, TimelineCursor } from './action_timeline';

interface TestAction {
  at: number;
  hold?: number;
  name: string;
}

describe('temporización de acciones', () => {
  it('convierte segundos en pasos a 60 fps', () => {
    expect(frameCount(2, 60)).toBe(120);
    expect(frameCount(0, 60)).toBe(1);
    expect(stepAt(1.5, 60)).toBe(90);
    expect(stepAt(-1, 60)).toBe(0);
  });

  it('una acción mantenida empieza y termina en los pasos correctos', () => {
    const events = buildTimeline<TestAction>([{ at: 1, hold: 0.5, name: 'fire' }], 60);
    expect(events.map((e) => [e.step, e.phase])).toEqual([
      [60, 'start'],
      [90, 'end'],
    ]);
  });

  it('un toque dura al menos un paso', () => {
    const events = buildTimeline<TestAction>([{ at: 0.2, name: 'use' }], 60);
    expect(events[1]!.step - events[0]!.step).toBe(1);
  });

  it('ordena por paso; en el mismo paso, primero los finales y luego el orden escrito', () => {
    const events = buildTimeline<TestAction>(
      [
        { at: 1, name: 'b' },
        { at: 0, hold: 1, name: 'a' },
        { at: 1, name: 'c' },
      ],
      60,
    );
    expect(events.map((e) => `${e.step}:${e.phase}:${e.action.name}`)).toEqual([
      '0:start:a',
      '60:end:a',
      '60:start:b',
      '60:start:c',
      '61:end:b',
      '61:end:c',
    ]);
  });

  it('el cursor entrega cada evento una sola vez y en orden', () => {
    const events = buildTimeline<TestAction>(
      [
        { at: 0, hold: 0.1, name: 'a' },
        { at: 0.05, name: 'b' },
      ],
      60,
    );
    const cursor = new TimelineCursor(events);
    const seen: string[] = [];
    for (let step = 0; step < 20; step++) {
      for (const event of cursor.take(step))
        seen.push(`${step}:${event.phase}:${event.action.name}`);
    }
    expect(seen).toEqual(['0:start:a', '3:start:b', '4:end:b', '6:end:a']);
    expect(cursor.take(100)).toEqual([]);
  });

  it('es determinista: la misma entrada da la misma línea de tiempo', () => {
    const actions: TestAction[] = [
      { at: 0.3, hold: 1, name: 'x' },
      { at: 2, name: 'y' },
    ];
    expect(buildTimeline(actions, 60)).toEqual(buildTimeline(actions, 60));
  });
});
