// Lee video/guion.md y saca, de cada escena, su número, su título, el archivo de narración y el
// texto exacto que se dice (las líneas que empiezan por `>` del bloque «Narración»). Puro.

export interface ScriptScene {
  number: number;
  title: string;
  /** Nombre del archivo de narración, por ejemplo `escena_01_gancho.wav`. */
  file: string;
  /** Texto de la narración, en una sola línea. */
  text: string;
}

const SCENE_HEADING = /^## Escena (\d+) — (.+)$/gm;
const FILE_LINE = /\*\*Archivo de narración:\*\* `(escena_\d{2}_[a-z0-9_]+\.wav)`/;
const NARRATION = /### Narración\s*\n((?:>.*(?:\n|$))+)/;

export function parseScript(markdown: string): ScriptScene[] {
  const headings = [...markdown.matchAll(SCENE_HEADING)];
  if (headings.length === 0) throw new Error('El guion no tiene escenas («## Escena N — Título»).');
  return headings.map((heading, i) => {
    const start = heading.index;
    const end = i + 1 < headings.length ? headings[i + 1]!.index : markdown.length;
    const body = markdown.slice(start, end);
    const number = Number(heading[1]);
    const title = heading[2]!.trim();
    const file = FILE_LINE.exec(body)?.[1];
    if (!file)
      throw new Error(`Escena ${number}: falta «**Archivo de narración:** \`escena_…wav\`».`);
    const block = NARRATION.exec(body)?.[1];
    if (!block)
      throw new Error(`Escena ${number}: falta el bloque «### Narración» con líneas «>».`);
    const text = block
      .split('\n')
      .map((line) => line.replace(/^>\s?/, '').trim())
      .filter((line) => line.length > 0)
      .join(' ');
    if (!text) throw new Error(`Escena ${number}: la narración está vacía.`);
    return { number, title, file, text };
  });
}
