export type Action =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'jump'
  | 'crouch'
  | 'run'
  | 'fire'
  | 'altFire'
  | 'use'
  | 'automap'
  | 'weapon1'
  | 'weapon2'
  | 'weapon3'
  | 'weapon4'
  | 'weapon5'
  | 'stats';

/** Asignación de teclas (`KeyboardEvent.code`) a acciones. */
export const DEFAULT_KEY_BINDINGS: Readonly<Record<string, Action>> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'jump',
  // C es la tecla principal para agacharse: Ctrl+W cierra la pestaña del navegador.
  KeyC: 'crouch',
  ControlLeft: 'crouch',
  ControlRight: 'crouch',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  KeyE: 'use',
  Tab: 'automap',
  Digit1: 'weapon1',
  Digit2: 'weapon2',
  Digit3: 'weapon3',
  Digit4: 'weapon4',
  Digit5: 'weapon5',
  F3: 'stats',
};

/** Asignación de botones del ratón (`MouseEvent.button`) a acciones. */
export const DEFAULT_MOUSE_BINDINGS: Readonly<Record<number, Action>> = {
  0: 'fire',
  2: 'altFire',
};
