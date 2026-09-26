/** Estadísticas de una partida de nivel, para la pantalla de fin de nivel. */
export class LevelStats {
  time = 0;
  kills = 0;
  items = 0;
  secrets = 0;

  constructor(
    readonly totalKills: number,
    readonly totalItems: number,
    readonly totalSecrets: number,
  ) {}

  summary(): LevelSummary {
    const percent = (value: number, total: number) =>
      total === 0 ? 100 : Math.round((value / total) * 100);
    return {
      time: this.time,
      kills: percent(this.kills, this.totalKills),
      items: percent(this.items, this.totalItems),
      secrets: percent(this.secrets, this.totalSecrets),
      counts: {
        kills: [this.kills, this.totalKills],
        items: [this.items, this.totalItems],
        secrets: [this.secrets, this.totalSecrets],
      },
    };
  }
}

export interface LevelSummary {
  time: number;
  kills: number;
  items: number;
  secrets: number;
  counts: { kills: [number, number]; items: [number, number]; secrets: [number, number] };
}

/** "m:ss" a partir de segundos. */
export function formatTime(seconds: number): string {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
