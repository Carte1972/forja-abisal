export function DeathScreen(props: {
  levelLabel: string;
  onRetry: () => void;
  onQuit: () => void;
}) {
  return (
    <div className="overlay menu-overlay death-screen">
      <p className="overlay-level">{props.levelLabel}</p>
      <h1>Has caído</h1>
      <p className="overlay-help">
        La forja no perdona. Vuelve a intentarlo con lo que tenías al entrar.
      </p>
      <div className="menu-list">
        <button type="button" className="menu-button" onClick={props.onRetry}>
          Reintentar nivel
        </button>
        <button type="button" className="menu-button menu-button-secondary" onClick={props.onQuit}>
          Salir al menú
        </button>
      </div>
    </div>
  );
}
