import { formatTime, type LevelSummary } from '../game/rules/level_stats';

interface LevelEndProps {
  summary: LevelSummary;
  onRestart: () => void;
}

/** Pantalla de fin de nivel: tiempo y porcentajes de enemigos, objetos y secretos. */
export function LevelEnd({ summary, onRestart }: LevelEndProps) {
  const rows: [string, number, [number, number]][] = [
    ['Enemigos', summary.kills, summary.counts.kills],
    ['Objetos', summary.items, summary.counts.items],
    ['Secretos', summary.secrets, summary.counts.secrets],
  ];
  return (
    <div className="overlay level-end">
      <h1>Nivel completado</h1>
      <table className="level-end-table">
        <tbody>
          <tr>
            <th>Tiempo</th>
            <td>{formatTime(summary.time)}</td>
            <td />
          </tr>
          {rows.map(([label, percent, [done, total]]) => (
            <tr key={label}>
              <th>{label}</th>
              <td>{percent}%</td>
              <td className="level-end-count">
                {done} / {total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="overlay-button" onClick={onRestart}>
        Jugar de nuevo
      </button>
    </div>
  );
}
