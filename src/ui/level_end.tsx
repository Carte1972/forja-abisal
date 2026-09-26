import { formatTime, type LevelSummary } from '../game/rules/level_stats';

interface LevelEndProps {
  levelName: string;
  summary: LevelSummary;
  /** Nombre del siguiente nivel, o null si era el último. */
  nextName: string | null;
  onNext: () => void;
  onRestart: () => void;
}

/** Pantalla de fin de nivel: tiempo y porcentajes de enemigos, objetos y secretos. */
export function LevelEnd({ levelName, summary, nextName, onNext, onRestart }: LevelEndProps) {
  const rows: [string, number, [number, number]][] = [
    ['Enemigos', summary.kills, summary.counts.kills],
    ['Objetos', summary.items, summary.counts.items],
    ['Secretos', summary.secrets, summary.counts.secrets],
  ];
  return (
    <div className="overlay level-end">
      <p className="level-end-name">{levelName}</p>
      <h1>{nextName ? 'Nivel completado' : 'Has escapado del abismo'}</h1>
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
      {nextName ? (
        <button type="button" className="overlay-button" onClick={onNext}>
          Siguiente: {nextName}
        </button>
      ) : (
        <p className="overlay-help">Has completado todos los niveles.</p>
      )}
      <button type="button" className="overlay-button overlay-button-secondary" onClick={onRestart}>
        {nextName ? 'Repetir nivel' : 'Volver a empezar'}
      </button>
    </div>
  );
}
