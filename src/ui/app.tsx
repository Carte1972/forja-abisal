import { useEffect, useRef, useState } from 'react';
import { Game, type GameStatus, type PlayerCarry } from '../game/game';
import type { LevelSummary } from '../game/rules/level_stats';
import { initialLevelIndex, levelAt, nextLevelIndex } from './campaign';
import { ControlsPanel } from './controls_panel';
import { DeathScreen } from './death_screen';
import { LevelEnd } from './level_end';
import { MainMenu } from './main_menu';
import { OptionsMenu } from './options_menu';
import { PauseMenu } from './pause_menu';
import {
  browserStorage,
  defaultSettings,
  loadSettings,
  saveSettings,
  type Settings,
} from './settings_store';

declare global {
  interface Window {
    /** Acceso al juego desde la consola, solo en desarrollo. */
    __forja?: Game;
  }
}

type AppStatus = GameStatus | 'loading';
type Panel = 'options' | 'controls' | null;

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

const hasLevelParam = new URLSearchParams(window.location.search).has('nivel');

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  // Con ?nivel=N se entra directamente al nivel (útil para probar); si no, al menú principal.
  const [inGame, setInGame] = useState(hasLevelParam);
  const [panel, setPanel] = useState<Panel>(null);
  const [showLevels, setShowLevels] = useState(false);
  const [status, setStatus] = useState<AppStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [settings, setSettings] = useState<Settings>(() =>
    loadSettings(browserStorage(), defaultSettings(window.devicePixelRatio)),
  );
  const settingsRef = useRef(settings);
  const [run, setRun] = useState<RunState>(() => ({
    levelIndex: initialLevelIndex(window.location.search),
    carry: undefined,
    attempt: 0,
  }));
  const level = levelAt(run.levelIndex);
  const next = nextLevelIndex(run.levelIndex);
  const levelLabel = `${run.levelIndex >= 0 ? `Nivel ${run.levelIndex + 1} · ` : ''}${level.name}`;

  useEffect(() => {
    if (!inGame) return;
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
        created.applySettings(settingsRef.current);
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
  }, [inGame, run]);

  const changeSettings = (value: Settings) => {
    settingsRef.current = value;
    setSettings(value);
    saveSettings(browserStorage(), value);
    gameRef.current?.applySettings(value);
  };

  const startLevel = (levelIndex: number, carry: PlayerCarry | undefined) => {
    setCompletion(null);
    setPanel(null);
    setShowLevels(false);
    setStatus('loading');
    setError(null);
    setInGame(true);
    setRun((previous) => ({ levelIndex, carry, attempt: previous.attempt + 1 }));
  };

  const quitToMenu = () => {
    setPanel(null);
    setCompletion(null);
    setInGame(false);
    setStatus('loading');
  };

  const play = () => {
    setNotice(null);
    gameRef.current?.requestPlay().catch(() => {
      // Chrome exige esperar un momento tras salir del pointer lock antes de volver a pedirlo.
      setNotice('El navegador no ha capturado el ratón. Espera un segundo y vuelve a hacer clic.');
    });
  };

  const panelView =
    panel === 'options' ? (
      <OptionsMenu settings={settings} onChange={changeSettings} onClose={() => setPanel(null)} />
    ) : panel === 'controls' ? (
      <ControlsPanel onClose={() => setPanel(null)} />
    ) : null;

  if (!inGame) {
    return (
      <div className="game-root">
        {panelView ? (
          <div className="overlay menu-overlay">{panelView}</div>
        ) : (
          <MainMenu
            onNewGame={() => startLevel(0, undefined)}
            onChooseLevel={(index) => startLevel(index, undefined)}
            onOptions={() => setPanel('options')}
            onControls={() => setPanel('controls')}
            showLevels={showLevels}
            onToggleLevels={setShowLevels}
          />
        )}
      </div>
    );
  }

  return (
    <div className="game-root">
      <div ref={containerRef} className="game-container" />
      {panelView && status !== 'playing' && <div className="overlay menu-overlay">{panelView}</div>}
      {!panelView && status === 'paused' && (
        <PauseMenu
          levelLabel={levelLabel}
          notice={notice}
          onResume={play}
          onOptions={() => setPanel('options')}
          onControls={() => setPanel('controls')}
          onRestart={() => startLevel(run.levelIndex, run.carry)}
          onQuit={quitToMenu}
        />
      )}
      {!panelView && status === 'dead' && (
        <DeathScreen
          levelLabel={levelLabel}
          onRetry={() => startLevel(run.levelIndex, run.carry)}
          onQuit={quitToMenu}
        />
      )}
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
          onMenu={quitToMenu}
        />
      )}
      {!panelView && (status === 'loading' || status === 'ready') && (
        <div className="overlay" onClick={status === 'loading' ? undefined : play}>
          <h1>Forja Abisal</h1>
          <p className="overlay-level">{levelLabel}</p>
          {error ? (
            <p className="overlay-error">No se pudo iniciar el juego: {error}</p>
          ) : status === 'loading' ? (
            <p>Cargando…</p>
          ) : (
            <>
              <p className="overlay-action">Haz clic para empezar</p>
              <p className="overlay-help">
                WASD moverse · Ratón mirar · Espacio saltar · C agacharse · Shift correr · E usar ·
                Tab mapa · Esc pausa
              </p>
            </>
          )}
          {notice && <p className="overlay-notice">{notice}</p>}
        </div>
      )}
    </div>
  );
}
