import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseScript } from './script_parser';

const SAMPLE = `# Guion

## Escena 1 — Gancho

**Archivo de narración:** \`escena_01_gancho.wav\` · **Duración orientativa:** 10 s

### Narración

> Primera frase.
> Segunda frase…

### Imagen

- Algo.

## Escena 2 — Cierre

**Archivo de narración:** \`escena_02_cierre.wav\`

### Narración

> Adiós.
`;

describe('lector del guion', () => {
  it('saca número, título, archivo y texto de cada escena', () => {
    expect(parseScript(SAMPLE)).toEqual([
      {
        number: 1,
        title: 'Gancho',
        file: 'escena_01_gancho.wav',
        text: 'Primera frase. Segunda frase…',
      },
      { number: 2, title: 'Cierre', file: 'escena_02_cierre.wav', text: 'Adiós.' },
    ]);
  });

  it('avisa de lo que falta', () => {
    expect(() => parseScript('# Nada')).toThrow('no tiene escenas');
    expect(() => parseScript('## Escena 1 — X\n\n### Narración\n\n> Hola.\n')).toThrow(
      'Archivo de narración',
    );
    expect(() =>
      parseScript('## Escena 1 — X\n\n**Archivo de narración:** `escena_01_x.wav`\n'),
    ).toThrow('Narración');
  });

  it('lee el guion real: 7 escenas con sus archivos en orden', () => {
    const scenes = parseScript(readFileSync(join(__dirname, '..', 'guion.md'), 'utf8'));
    expect(scenes.map((scene) => scene.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(scenes.map((scene) => scene.file)).toEqual([
      'escena_01_gancho.wav',
      'escena_02_historia.wav',
      'escena_03_controles_y_armas.wav',
      'escena_04_enemigos.wav',
      'escena_05_niveles.wav',
      'escena_06_trucos.wav',
      'escena_07_cierre.wav',
    ]);
    expect(scenes[6]!.text).toContain('en tu estado actual');
    for (const scene of scenes) expect(scene.text).not.toMatch(/[()>]/);
  });
});
