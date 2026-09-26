import type { KeyColor, LevelData, Point2 } from '../engine/level/level_types';
import { buildAutomapLines, type AutomapKind } from '../hud/automap_lines';

/**
 * Plano completo de un nivel en SVG (el de INSTRUCCIONES.md): sectores coloreados por altura y
 * tipo, las líneas del automapa, losas, inicio, llaves y salida. Puro: no usa el DOM.
 * Lo genera `npm run planos` en docs/planos/.
 */

/** Etiqueta de una sala: texto y, si hace falta, posición (en metros) y tamaño de letra. */
export interface PlanLabel {
  text: string;
  at?: Point2;
  size?: number;
}

export interface PlanOptions {
  /** Etiquetas por `id` de sector. Los sectores sin etiqueta no se rotulan. */
  labels: Record<string, string | PlanLabel>;
}

/** Píxeles por metro. */
const SCALE = 12;
const PAD = 40;
/** Espacio para el título, encima del plano. */
const HEADER = 30;
/** Los sectores más pequeños que esto (m²) no se rotulan, salvo los secretos. */
const MIN_LABEL_AREA = 14;

const KEY_COLORS: Record<KeyColor, string> = {
  red: '#ff4030',
  blue: '#3a80ff',
  yellow: '#ffd020',
};
const LINE_COLORS: Record<AutomapKind, string> = {
  wall: '#ff8a3a',
  step: '#8a6a50',
  hazard: '#ff3a18',
  lift: '#40d0a0',
  door: '#c0c0c0',
};

export function buildLevelPlanSvg(level: LevelData, options: PlanOptions): string {
  const vertices = level.vertices;
  const xs = vertices.map((v) => v[0]);
  const zs = vertices.map((v) => v[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const width = Math.ceil((maxX - minX) * SCALE + PAD * 2);
  const height = Math.ceil((maxZ - minZ) * SCALE + PAD * 2 + HEADER);
  const px = (x: number) => ((x - minX) * SCALE + PAD).toFixed(1);
  const pz = (z: number) => ((z - minZ) * SCALE + PAD + HEADER).toFixed(1);
  const ring = (indices: readonly number[]) =>
    indices.map((i) => `${px(vertices[i]![0])},${pz(vertices[i]![1])}`);

  const heights = level.sectors.map((s) => s.floor.height);
  const lowest = Math.min(...heights);
  const highest = Math.max(...heights);

  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="ui-monospace, Menlo, Consolas, monospace">`,
  );
  out.push(`<rect width="${width}" height="${height}" fill="#0d0907"/>`);
  out.push(
    `<text x="${PAD}" y="28" fill="#ff8a3a" font-size="16" font-weight="700">${escapeXml(level.name.toUpperCase())}</text>`,
  );
  out.push(
    `<text x="${width - PAD}" y="28" fill="#8a7060" font-size="12" text-anchor="end">N ↑ · cuadrícula de 4 m</text>`,
  );

  // Cuadrícula de 4 m.
  for (let x = Math.ceil(minX / 4) * 4; x <= maxX; x += 4) {
    out.push(
      `<line x1="${px(x)}" y1="${pz(minZ)}" x2="${px(x)}" y2="${pz(maxZ)}" stroke="#1c1410"/>`,
    );
  }
  for (let z = Math.ceil(minZ / 4) * 4; z <= maxZ; z += 4) {
    out.push(
      `<line x1="${px(minX)}" y1="${pz(z)}" x2="${px(maxX)}" y2="${pz(z)}" stroke="#1c1410"/>`,
    );
  }

  // Suelos: más claros cuanto más altos; lava, ácido, ascensores, puertas y secretos con su color.
  for (const sector of level.sectors) {
    const special = sector.special;
    const t = (sector.floor.height - lowest) / Math.max(1e-6, highest - lowest);
    const g = Math.round(28 + t * 42);
    let fill = `rgb(${g + 6},${g},${Math.round(g * 0.8)})`;
    if (special?.type === 'damage') {
      fill = sector.floor.texture.includes('acid') ? '#1f4a12' : '#6a1e08';
    }
    if (special?.type === 'lift') fill = '#123a32';
    if (special?.type === 'door') {
      fill = special.hidden ? '#4a2a5a' : special.key ? `${KEY_COLORS[special.key]}66` : '#3a3a3a';
    }
    if (sector.secret) fill = '#3a1f4a';
    const path = [sector.outer, ...sector.holes].map((r) => `M${ring(r).join(' L')} Z`).join(' ');
    const id = sector.id ? ` data-sector="${escapeXml(sector.id)}"` : '';
    out.push(`<path d="${path}" fill="${fill}" fill-rule="evenodd"${id}/>`);
  }

  for (const slab of level.slabs) {
    out.push(
      `<polygon points="${ring(slab.outer).join(' ')}" fill="#8a7a6a55" stroke="#c0b0a0" stroke-width="1.2" stroke-dasharray="4 3"/>`,
    );
  }

  for (const line of buildAutomapLines(level)) {
    const color = line.kind === 'door' && line.key ? KEY_COLORS[line.key] : LINE_COLORS[line.kind];
    const strokeWidth = line.kind === 'wall' || line.kind === 'door' ? 2 : 1.2;
    out.push(
      `<line x1="${px(line.a[0])}" y1="${pz(line.a[1])}" x2="${px(line.b[0])}" y2="${pz(line.b[1])}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`,
    );
  }

  for (const sector of level.sectors) {
    const label = sector.secret ? { text: 'secreto' } : labelFor(options.labels, sector.id);
    if (!label) continue;
    const points = sector.outer.map((i) => vertices[i]!);
    if (!sector.secret && !label.at && polygonArea(points) < MIN_LABEL_AREA) continue;
    const [cx, cz] = label.at ?? centroid(points);
    out.push(
      `<text x="${px(cx)}" y="${pz(cz)}" fill="${sector.secret ? '#d0a0ff' : '#e8d6c4'}" font-size="${label.size ?? 11}" text-anchor="middle" dominant-baseline="middle" data-label="${escapeXml(sector.id ?? '')}">${escapeXml(label.text)}</text>`,
    );
  }

  for (const thing of level.things) {
    const [x, z] = thing.position;
    const item = typeof thing.properties.item === 'string' ? thing.properties.item : '';
    if (thing.type === 'player_start') {
      // Flecha en la dirección inicial: el ángulo 0 mira al norte (-Z).
      const fx = -Math.sin(thing.angle);
      const fz = -Math.cos(thing.angle);
      const at = (forward: number, side: number) =>
        `${px(x + fx * forward - fz * side)},${pz(z + fz * forward + fx * side)}`;
      out.push(
        `<polygon points="${at(1.1, 0)} ${at(-0.8, 0.8)} ${at(-0.4, 0)} ${at(-0.8, -0.8)}" fill="#ffffff"/>`,
      );
      out.push(
        `<text x="${px(x)}" y="${(Number(pz(z)) + 20).toFixed(1)}" fill="#ffffff" font-size="11" text-anchor="middle">inicio</text>`,
      );
    } else if (thing.type === 'pickup' && item.startsWith('key_')) {
      const color = KEY_COLORS[item.slice(4) as KeyColor];
      out.push(
        `<circle cx="${px(x)}" cy="${pz(z)}" r="6" fill="${color}" stroke="#000" stroke-width="1.5" data-key="${item.slice(4)}"/>`,
      );
    } else if (thing.type === 'exit') {
      out.push(
        `<rect x="${(Number(px(x)) - 6).toFixed(1)}" y="${(Number(pz(z)) - 6).toFixed(1)}" width="12" height="12" fill="#60ff90" stroke="#000" stroke-width="1.5" data-exit=""/>`,
      );
    }
  }

  out.push('</svg>');
  return `${out.join('\n')}\n`;
}

function labelFor(labels: PlanOptions['labels'], id: string | undefined): PlanLabel | null {
  if (!id) return null;
  const label = labels[id];
  if (label === undefined) return null;
  return typeof label === 'string' ? { text: label } : label;
}

function polygonArea(points: readonly Point2[]): number {
  let area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += (points[j]![0] + points[i]![0]) * (points[j]![1] - points[i]![1]);
  }
  return Math.abs(area / 2);
}

/** Media de los vértices: basta para rotular salas; si cae mal, se da `at` en la etiqueta. */
function centroid(points: readonly Point2[]): Point2 {
  const x = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const z = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  return [x, z];
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
