// Genera los niveles en JSON a partir de sus fuentes en scripts/levels/.
// Uso: npm run levels
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { level01 } from './levels/level_01.ts';
import { level02 } from './levels/level_02.ts';
import { level03 } from './levels/level_03.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const levels: [string, () => Record<string, unknown>][] = [
  ['level_01.json', level01],
  ['level_02.json', level02],
  ['level_03.json', level03],
];

for (const [file, build] of levels) {
  const path = join(root, 'src', 'levels', file);
  writeFileSync(path, `${JSON.stringify(build(), null, 2)}\n`);
  console.log(`✓ ${file}`);
}
