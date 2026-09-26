const CONTROLS: [string, string][] = [
  ['W A S D / flechas', 'Moverse'],
  ['Ratón', 'Mirar'],
  ['Clic izquierdo', 'Disparar'],
  ['Clic derecho', 'Disparo alternativo'],
  ['1 – 5 / rueda', 'Cambiar de arma'],
  ['R', 'Recargar'],
  ['Espacio', 'Saltar'],
  ['C o Ctrl', 'Agacharse'],
  ['Shift', 'Correr'],
  ['E', 'Usar (puertas, ascensores, interruptores)'],
  ['Tab', 'Automapa'],
  ['F3', 'Panel de rendimiento'],
  ['Esc', 'Pausa'],
];

export function ControlsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="menu-panel">
      <h2>Controles</h2>
      <table className="controls-table">
        <tbody>
          {CONTROLS.map(([key, action]) => (
            <tr key={key}>
              <th>{key}</th>
              <td>{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="menu-note">Agacharse con C evita que Ctrl+W cierre la pestaña del navegador.</p>
      <div className="menu-actions">
        <button type="button" className="menu-button" onClick={onClose}>
          Volver
        </button>
      </div>
    </div>
  );
}
