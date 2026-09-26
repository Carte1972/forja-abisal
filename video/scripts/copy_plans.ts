// Copia los planos de los niveles (docs/planos/*.svg, los de INSTRUCCIONES.md) a
// video/public/planos/, donde los lee Remotion. Se ejecuta antes del Studio y del render.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const videoDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(videoDir, '..', 'docs', 'planos');
const target = join(videoDir, 'public', 'planos');
mkdirSync(target, { recursive: true });
for (const file of readdirSync(source).filter((name) => name.endsWith('.svg'))) {
  copyFileSync(join(source, file), join(target, file));
}
