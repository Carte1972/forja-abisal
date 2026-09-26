// Busca un navegador ya instalado para que Remotion renderice sin descargar nada: primero
// REMOTION_BROWSER, después el Chrome sin interfaz que Playwright tenga en el equipo y, si no,
// Google Chrome. Lo usan remotion.config.ts y scripts/render.ts.
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function findBrowser(): string | null {
  if (process.env.REMOTION_BROWSER) return process.env.REMOTION_BROWSER;
  const caches = [
    join(homedir(), 'Library', 'Caches', 'ms-playwright'),
    join(homedir(), '.cache', 'ms-playwright'),
  ];
  for (const cache of caches) {
    if (!existsSync(cache)) continue;
    const shells = readdirSync(cache)
      .filter((dir) => dir.startsWith('chromium_headless_shell-'))
      .sort()
      .reverse();
    for (const dir of shells) {
      for (const sub of readdirSync(join(cache, dir))) {
        const candidate = join(cache, dir, sub, 'chrome-headless-shell');
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  return existsSync(chrome) ? chrome : null;
}
