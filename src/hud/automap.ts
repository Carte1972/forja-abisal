import { findSectorAt } from '../engine/level/level_queries';
import type { KeyColor, LevelData, Point2 } from '../engine/level/level_types';
import { buildAutomapLines, type AutomapLine } from './automap_lines';

const KEY_CSS: Record<KeyColor, string> = { red: '#ff4030', blue: '#3a80ff', yellow: '#ffd020' };
const LINE_CSS = {
  wall: '#ff8a3a',
  step: '#8a6a50',
  hazard: '#ff3a18',
  lift: '#40d0a0',
  door: '#c0c0c0',
} as const;
/** Píxeles de pantalla (CSS) por metro. */
const SCALE = 11;

export interface AutomapMarker {
  position: Point2;
  kind: 'key' | 'exit';
  key?: KeyColor;
}

/**
 * Automapa 2D (tecla Tab) dibujado en un canvas sobre el juego. Solo muestra lo descubierto:
 * los sectores por los que ha pasado el jugador y los que tienen al lado (menos las paredes
 * secretas, para no delatar lo que hay detrás).
 */
export class Automap {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly lines: AutomapLine[];
  private readonly neighbours = new Map<number, Set<number>>();
  private readonly revealed = new Set<number>();
  private readonly visited = new Set<number>();
  private readonly hiddenDoors = new Set<number>();
  private visible = false;
  private lastDraw = 0;

  constructor(
    parent: HTMLElement,
    private readonly level: LevelData,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'automap';
    this.canvas.hidden = true;
    parent.appendChild(this.canvas);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('El navegador no admite canvas 2D');
    this.ctx = ctx;
    this.lines = buildAutomapLines(level);
    for (const sector of level.sectors) {
      if (sector.special?.type === 'door' && sector.special.hidden)
        this.hiddenDoors.add(sector.index);
    }
    this.linkNeighbours();
  }

  get isVisible(): boolean {
    return this.visible;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.canvas.hidden = !this.visible;
  }

  /** El jugador está en este sector: se descubre junto a sus vecinos. */
  reveal(sector: number): void {
    if (this.visited.has(sector)) return;
    this.visited.add(sector);
    this.revealed.add(sector);
    for (const next of this.neighbours.get(sector) ?? []) {
      if (!this.hiddenDoors.has(next)) this.revealed.add(next);
    }
  }

  draw(
    time: number,
    player: { x: number; z: number; yaw: number },
    markers: AutomapMarker[],
  ): void {
    if (!this.visible || time - this.lastDraw < 1 / 30) return;
    this.lastDraw = time;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (
      this.canvas.width !== Math.round(width * dpr) ||
      this.canvas.height !== Math.round(height * dpr)
    ) {
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
    }
    const c = this.ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, width, height);
    c.fillStyle = 'rgba(6, 4, 3, 0.78)';
    c.fillRect(0, 0, width, height);

    // Centrado en el jugador, con el norte (-Z) hacia arriba.
    const cx = width / 2;
    const cy = height / 2;
    const toScreen = (p: Point2): [number, number] => [
      cx + (p[0] - player.x) * SCALE,
      cy + (p[1] - player.z) * SCALE,
    ];

    c.lineCap = 'round';
    for (const line of this.lines) {
      if (!line.sectors.some((s) => this.revealed.has(s))) continue;
      const [x1, y1] = toScreen(line.a);
      const [x2, y2] = toScreen(line.b);
      c.strokeStyle = line.kind === 'door' && line.key ? KEY_CSS[line.key] : LINE_CSS[line.kind];
      c.lineWidth = line.kind === 'wall' || line.kind === 'door' ? 2 : 1.2;
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();
    }

    for (const marker of markers) {
      // Solo lo que está en zonas descubiertas: el mapa no delata dónde están las llaves.
      const sector = findSectorAt(this.level, marker.position[0], marker.position[1]);
      if (!sector || !this.revealed.has(sector.index)) continue;
      const [x, y] = toScreen(marker.position);
      if (marker.kind === 'exit') {
        c.fillStyle = '#60ff90';
        c.fillRect(x - 5, y - 5, 10, 10);
      } else if (marker.key) {
        c.fillStyle = KEY_CSS[marker.key];
        c.beginPath();
        c.arc(x, y, 5, 0, Math.PI * 2);
        c.fill();
      }
    }

    // Flecha del jugador: yaw 0 mira al norte (arriba en pantalla).
    c.save();
    c.translate(cx, cy);
    c.rotate(-player.yaw);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(0, -9);
    c.lineTo(6, 7);
    c.lineTo(0, 3);
    c.lineTo(-6, 7);
    c.closePath();
    c.fill();
    c.restore();

    c.fillStyle = '#c0a080';
    c.font = '600 14px ui-monospace, Menlo, monospace';
    c.fillText(this.level.name.toUpperCase(), 16, height - 110);
  }

  dispose(): void {
    this.canvas.remove();
  }

  /** Vecinos: sectores que comparten una arista (aunque no haya línea que dibujar entre ellos). */
  private linkNeighbours(): void {
    const owners = new Map<string, number[]>();
    for (const sector of this.level.sectors) {
      for (const ring of [sector.outer, ...sector.holes]) {
        ring.forEach((a, i) => {
          const b = ring[(i + 1) % ring.length]!;
          const key = a < b ? `${a}:${b}` : `${b}:${a}`;
          const list = owners.get(key) ?? [];
          list.push(sector.index);
          owners.set(key, list);
        });
      }
    }
    for (const list of owners.values()) {
      if (list.length !== 2) continue;
      const [a, b] = list as [number, number];
      if (!this.neighbours.has(a)) this.neighbours.set(a, new Set());
      if (!this.neighbours.has(b)) this.neighbours.set(b, new Set());
      this.neighbours.get(a)!.add(b);
      this.neighbours.get(b)!.add(a);
    }
  }
}
