import { LEVELS } from '../levels/index';

interface MainMenuProps {
  onNewGame: () => void;
  onChooseLevel: (index: number) => void;
  onOptions: () => void;
  onControls: () => void;
  showLevels: boolean;
  onToggleLevels: (show: boolean) => void;
}

/** Menú principal: nueva partida, elegir nivel, opciones y controles. */
export function MainMenu(props: MainMenuProps) {
  return (
    <div className="main-menu">
      <div className="main-menu-embers" aria-hidden="true" />
      <h1 className="main-menu-title">Forja Abisal</h1>
      <p className="main-menu-subtitle">Desciende. Abre paso. Sal con vida.</p>
      {props.showLevels ? (
        <div className="menu-list">
          {LEVELS.map((level, index) => (
            <button
              key={level.id}
              type="button"
              className="menu-button"
              onClick={() => props.onChooseLevel(index)}
            >
              {index + 1}. {level.name}
            </button>
          ))}
          {import.meta.env.DEV && (
            <button
              type="button"
              className="menu-button menu-button-secondary"
              onClick={() => props.onChooseLevel(-1)}
            >
              Nivel de pruebas
            </button>
          )}
          <button
            type="button"
            className="menu-button menu-button-secondary"
            onClick={() => props.onToggleLevels(false)}
          >
            Volver
          </button>
        </div>
      ) : (
        <div className="menu-list">
          <button type="button" className="menu-button" onClick={props.onNewGame}>
            Nueva partida
          </button>
          <button type="button" className="menu-button" onClick={() => props.onToggleLevels(true)}>
            Elegir nivel
          </button>
          <button type="button" className="menu-button" onClick={props.onOptions}>
            Opciones
          </button>
          <button type="button" className="menu-button" onClick={props.onControls}>
            Controles
          </button>
        </div>
      )}
      <p className="main-menu-footer">Todo el contenido es original y se genera por código.</p>
    </div>
  );
}
