import { useEffect, useRef, useState } from 'react';
import { Game, type GameStatus } from '../game/game';
import type { LevelSummary } from '../game/rules/level_stats';
import { LevelEnd } from './level_end';

declare global {
  interface Window {
    /** Acceso al juego desde la consola, solo en desarrollo. */
    __forja?: Game;
  }
}

type AppStatus = GameStatus | 'loading';

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [status, setStatus] = useState<AppStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [summary, setSummary] = useState<LevelSummary | null>(null);
  // Cambiar la clave vuelve a crear el juego desde cero (jugar de nuevo).
  const [run, setRun] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let game: Game | null = null;

    Game.create(container, { onStatusChange: setStatus, onLevelComplete: setSummary })
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

  const restart = () => {
    setSummary(null);
    setStatus('loading');
    setRun((value) => value + 1);
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
      {status === 'complete' && summary && <LevelEnd summary={summary} onRestart={restart} />}
      {status !== 'playing' && status !== 'complete' && (
        <div className="overlay" onClick={status === 'loading' ? undefined : play}>
          <h1>Forja Abisal</h1>
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
