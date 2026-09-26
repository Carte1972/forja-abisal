interface PauseMenuProps {
  levelLabel: string;
  notice: string | null;
  onResume: () => void;
  onOptions: () => void;
  onControls: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export function PauseMenu(props: PauseMenuProps) {
  return (
    <div className="overlay menu-overlay">
      <p className="overlay-level">{props.levelLabel}</p>
      <h1>Pausa</h1>
      <div className="menu-list">
        <button type="button" className="menu-button" onClick={props.onResume}>
          Continuar
        </button>
        <button type="button" className="menu-button" onClick={props.onOptions}>
          Opciones
        </button>
        <button type="button" className="menu-button" onClick={props.onControls}>
          Controles
        </button>
        <button
          type="button"
          className="menu-button menu-button-secondary"
          onClick={props.onRestart}
        >
          Reiniciar nivel
        </button>
        <button type="button" className="menu-button menu-button-secondary" onClick={props.onQuit}>
          Salir al menú
        </button>
      </div>
      {props.notice && <p className="overlay-notice">{props.notice}</p>}
    </div>
  );
}
