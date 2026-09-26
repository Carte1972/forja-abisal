import { useEffect, useRef, useState } from 'react';
import { Game, type GameStatus, type PlayerCarry } from '../game/game';
import type { LevelSummary } from '../game/rules/level_stats';
import { initialLevelIndex, levelAt, nextLevelIndex } from './campaign';
import { LevelEnd } from './level_end';

declare global {
  interface Window {
    /** Acceso al juego desde la consola, solo en desarrollo. */
    __forja?: Game;
  }
}

type AppStatus = GameStatus | 'loading';

interface RunState {
  levelIndex: number;
  /** Estado con el que se empieza el nivel (el del final del anterior). */
  carry: PlayerCarry | undefined;
  /** Contador para recrear el juego aunque se repita el mismo nivel. */
  attempt: number;
}

interface Completion {
  summary: LevelSummary;
  carry: PlayerCarry;
}

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [status, setStatus] = useState<AppStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [run, setRun] = useState<RunState>(() => ({
    levelIndex: initialLevelIndex(window.location.search),
    carry: undefined,
    attempt: 0,
  }));
  const level = levelAt(run.levelIndex);
  const next = nextLevelIndex(run.levelIndex);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let game: Game | null = null;

    Game.create(
      container,
      {
        onStatusChange: setStatus,
        onLevelComplete: (summary, carry) => setCompletion({ summary, carry }),
      },
      { level: levelAt(run.levelIndex).data, carry: run.carry },
    )
      .then((created) => {
        if (cancelled) {
          created.dispose();
          return;
        }
        game = created;
        gameRef.current = created;
        if (import.meta.env.DEV) window.__forja = created;
      })
      .catch((err: unknown) => {
        console.error(err);
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
      game?.dispose();
      gameRef.current = null;
      if (import.meta.env.DEV) delete window.__forja;
    };
  }, [run]);

  const startLevel = (levelIndex: number, carry: PlayerCarry | undefined) => {
    setCompletion(null);
    setStatus('loading');
    setRun((previous) => ({ levelIndex, carry, attempt: previous.attempt + 1 }));
  };

  const play = () => {
    setNotice(null);
    gameRef.current?.requestPlay().catch(() => {
      // Chrome exige esperar un momento tras salir del pointer lock antes de volver a pedirlo.
      setNotice('El navegador no ha capturado el ratón. Espera un segundo y vuelve a hacer clic.');
    });
  };

  return (
    <div className="game-root">
      <div ref={containerRef} className="game-container" />
      {status === 'complete' && completion && (
        <LevelEnd
          levelName={level.name}
          summary={completion.summary}
          nextName={next === null ? null : levelAt(next).name}
          onNext={() => next !== null && startLevel(next, completion.carry)}
          // Repetir empieza el nivel con lo que se tenía al entrar; volver a empezar, desde cero.
          onRestart={() =>
            next === null ? startLevel(0, undefined) : startLevel(run.levelIndex, run.carry)
          }
        />
      )}
      {status !== 'playing' && status !== 'complete' && (
        <div className="overlay" onClick={status === 'loading' ? undefined : play}>
          <h1>Forja Abisal</h1>
          <p className="overlay-level">
            {run.levelIndex >= 0 ? `Nivel ${run.levelIndex + 1} · ` : ''}
            {level.name}
          </p>
          {error ? (
            <p className="overlay-error">No se pudo iniciar el juego: {error}</p>
          ) : status === 'loading' ? (
            <p>Cargando…</p>
          ) : (
            <>
              <p className="overlay-action">
                {status === 'paused' ? 'Pausa · haz clic para continuar' : 'Haz clic para jugar'}
              </p>
              <p className="overlay-help">
                WASD moverse · Ratón mirar · Espacio saltar · C o Ctrl agacharse · Shift correr · E
                usar · R recargar · 1-5 armas · Esc pausa
              </p>
            </>
          )}
          {notice && <p className="overlay-notice">{notice}</p>}
        </div>
      )}
    </div>
  );
}
