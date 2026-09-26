// Genera los planos SVG de los niveles de la campaña en docs/planos/ (los de INSTRUCCIONES.md).
// Uso: npm run planos
// El código de src/ usa imports sin extensión, así que se carga con el ejecutor de módulos de
// Vite (runnerImport) en lugar de importarlo directamente desde Node.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';
import type * as LevelParser from '../src/engine/level/level_parser.ts';
import type * as Levels from '../src/levels/index.ts';
import type * as LevelPlan from '../src/levels/level_plan.ts';

type Point2 = readonly [number, number];
type Label = string | { text: string; at?: Point2; size?: number };

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Nombres de las salas por `id` de sector (los secretos se rotulan solos). */
const NAMES: Record<string, string> = {
  entrada: 'entrada',
  pasillo: 'pasillo',
  fundicion: 'fundición',
  galeria: 'galería',
  sotano: 'sótano',
  control: 'control',
  rampa_patio: 'rampa',
  patio: 'patio',
  plataforma: 'plataforma',
  salida: 'salida',
  esclusa: 'esclusa',
  anillo_sur: 'anillo sur',
  anillo_norte: 'anillo norte',
  anillo_oeste: 'anillo oeste',
  anillo_este: 'anillo este',
  anillo_inferior: 'anillo inferior',
  rampa_sima: 'rampa',
  pozo_acido: 'pozo de ácido',
  crematorio: 'crematorio',
  entreplanta: 'entreplanta',
  galeria_baja: 'galería',
  sala_alta: 'sala alta',
  pasillo_salida: 'pasillo',
  sala_salida: 'salida',
  orilla_sur: 'orilla sur',
  orilla_norte: 'orilla norte',
  lago_lava: 'lago de lava',
  isla: 'isla',
  torre: 'torre',
  armeria: 'armería',
  refrigeracion: 'refrig.',
  sala_fria: 'sala fría',
  canal_acido: 'canal de ácido',
};

/** Posiciones (en metros) de las etiquetas que en el centro de su sala se solaparían. */
const PLACEMENT: Record<string, Record<string, { at: Point2; size?: number }>> = {
  level_01: {
    plataforma: { at: [3, -39.2] },
    control: { at: [25, -12.5] },
  },
  level_02: {
    pozo_acido: { at: [5, -23.5] },
    anillo_inferior: { at: [5, -14] },
    entreplanta: { at: [2, -47] },
    galeria_baja: { at: [23.2, -21.2] },
    anillo_este: { at: [17, -14.5], size: 10 },
    anillo_oeste: { at: [-7, -27], size: 10 },
  },
  level_03: {
    sala_fria: { at: [21, -61.5] },
    isla: { at: [4, -30.6] },
    torre: { at: [4, -24.1] },
    lago_lava: { at: [-10, -28] },
    refrigeracion: { at: [21, -49.5], size: 10 },
  },
};

/** Nombre del archivo de cada nivel en docs/planos/. */
const FILES: Record<string, string> = {
  level_01: 'nivel_1_fundicion_cero.svg',
  level_02: 'nivel_2_pozos_de_ceniza.svg',
  level_03: 'nivel_3_nucleo_abisal.svg',
};

const load = async <T>(file: string): Promise<T> =>
  (await runnerImport<T>(join(root, file), { configFile: false, logLevel: 'error' })).module;

const { LEVELS } = await load<typeof Levels>('src/levels/index.ts');
const { parseLevel } = await load<typeof LevelParser>('src/engine/level/level_parser.ts');
const { buildLevelPlanSvg } = await load<typeof LevelPlan>('src/levels/level_plan.ts');

const outDir = join(root, 'docs', 'planos');
mkdirSync(outDir, { recursive: true });
for (const entry of LEVELS) {
  const file = FILES[entry.id];
  if (!file) throw new Error(`Falta el nombre de archivo del plano de ${entry.id} en FILES.`);
  const labels: Record<string, Label> = {};
  for (const [id, text] of Object.entries(NAMES)) {
    const placement = PLACEMENT[entry.id]?.[id];
    labels[id] = placement ? { text, ...placement } : text;
  }
  writeFileSync(join(outDir, file), buildLevelPlanSvg(parseLevel(entry.data), { labels }));
  console.log(`✓ docs/planos/${file}`);
}
