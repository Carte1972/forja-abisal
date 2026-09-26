import { describe, expect, it } from 'vitest';
import {
  createAiMemory,
  stepAi,
  type AiMemory,
  type AiParams,
  type AiPerception,
} from './ai_state_machine';

const PARAMS: AiParams = {
  attackRange: 10,
  attackWindup: 0.3,
  attackDuration: 0.8,
  attackCooldown: 1,
  reactionTime: 0.2,
  painDuration: 0.4,
  giveUpTime: 5,
};
const DT = 0.05;
const TARGET = { x: 5, y: 0, z: 0 };

const NOTHING: AiPerception = {
  canSeeTarget: false,
  targetPosition: null,
  targetDistance: Infinity,
  heardNoiseAt: null,
  damagedFrom: null,
  painTriggered: false,
  health: 100,
  hasPatrol: false,
  reachedLastKnown: false,
};
const SEES = (distance: number): AiPerception => ({
  ...NOTHING,
  canSeeTarget: true,
  targetPosition: TARGET,
  targetDistance: distance,
});

function run(memory: AiMemory, perception: AiPerception, seconds: number) {
  const commands = [];
  for (let t = 0; t < seconds - 1e-9; t += DT)
    commands.push(stepAi(memory, perception, PARAMS, DT));
  return commands;
}

describe('stepAi', () => {
  it('en reposo no hace nada y en patrulla sigue su ruta', () => {
    expect(stepAi(createAiMemory('idle'), NOTHING, PARAMS, DT)).toMatchObject({ move: 'none' });
    expect(stepAi(createAiMemory('patrol'), NOTHING, PARAMS, DT)).toMatchObject({ move: 'patrol' });
  });

  it('al ver al objetivo se alerta, reacciona y lo persigue', () => {
    const memory = createAiMemory();
    const first = stepAi(memory, SEES(30), PARAMS, DT);
    expect(first).toMatchObject({ entered: 'alert', move: 'none', face: 'lastKnown' });
    run(memory, SEES(30), PARAMS.reactionTime);
    expect(memory.state).toBe('chase');
    expect(stepAi(memory, SEES(30), PARAMS, DT)).toMatchObject({ move: 'target', face: 'target' });
  });

  it('un ruido lo alerta y lo manda al lugar del ruido', () => {
    const memory = createAiMemory();
    const noise = { x: -3, y: 0, z: 7 };
    stepAi(memory, { ...NOTHING, heardNoiseAt: noise }, PARAMS, DT);
    expect(memory.state).toBe('alert');
    expect(memory.lastKnown).toEqual(noise);
    run(memory, NOTHING, 0.3);
    expect(stepAi(memory, NOTHING, PARAMS, DT)).toMatchObject({ move: 'lastKnown' });
  });

  it('ataca a tiro, golpea una sola vez tras la preparación y respeta el enfriamiento', () => {
    const memory = createAiMemory();
    run(memory, SEES(5), 0.3);
    expect(memory.state).toBe('attack');
    const strikes = run(memory, SEES(5), PARAMS.attackDuration).filter((c) => c.strike);
    expect(strikes).toHaveLength(1);
    expect(memory.state).toBe('chase');
    // Durante el enfriamiento persigue en lugar de atacar.
    expect(stepAi(memory, SEES(5), PARAMS, DT)).toMatchObject({ move: 'target' });
    expect(memory.state).toBe('chase');
    run(memory, SEES(5), PARAMS.attackCooldown + 0.1);
    expect(['attack', 'chase']).toContain(memory.state);
  });

  it('no ataca fuera de alcance', () => {
    const memory = createAiMemory();
    run(memory, SEES(50), 2);
    expect(memory.state).toBe('chase');
  });

  it('el dolor interrumpe el ataque y luego vuelve a perseguir', () => {
    const memory = createAiMemory();
    run(memory, SEES(5), 0.3);
    expect(memory.state).toBe('attack');
    stepAi(memory, { ...SEES(5), damagedFrom: TARGET, painTriggered: true }, PARAMS, DT);
    expect(memory.state).toBe('pain');
    const during = run(memory, SEES(5), PARAMS.painDuration - DT);
    expect(during.every((c) => c.move === 'none' && !c.strike)).toBe(true);
    run(memory, SEES(50), 2 * DT);
    expect(memory.state).toBe('chase');
  });

  it('recibir daño sin verlo lo alerta hacia el atacante', () => {
    const memory = createAiMemory();
    const from = { x: 9, y: 0, z: 9 };
    stepAi(memory, { ...NOTHING, damagedFrom: from }, PARAMS, DT);
    expect(memory.state).toBe('alert');
    expect(memory.lastKnown).toEqual(from);
  });

  it('se rinde tras perder al objetivo y llegar a su última posición conocida', () => {
    const memory = createAiMemory('patrol');
    run(memory, SEES(40), 0.5);
    expect(memory.state).toBe('chase');
    run(memory, NOTHING, PARAMS.giveUpTime + 1);
    expect(memory.state).toBe('chase');
    stepAi(memory, { ...NOTHING, hasPatrol: true, reachedLastKnown: true }, PARAMS, DT);
    expect(memory.state).toBe('patrol');
    expect(memory.lastKnown).toBeNull();
  });

  it('muere al quedarse sin salud y ya no hace nada más', () => {
    const memory = createAiMemory();
    expect(stepAi(memory, { ...SEES(5), health: 0 }, PARAMS, DT)).toMatchObject({
      entered: 'dead',
    });
    expect(run(memory, SEES(5), 1).every((c) => c.move === 'none' && !c.strike)).toBe(true);
    expect(memory.state).toBe('dead');
  });
});
