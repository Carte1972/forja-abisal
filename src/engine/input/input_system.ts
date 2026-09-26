import { DEFAULT_KEY_BINDINGS, DEFAULT_MOUSE_BINDINGS, type Action } from './bindings';

/**
 * Estado de teclado y ratón. Las pulsaciones se guardan hasta que alguien las consume,
 * así no se pierden aunque en un frame no se ejecute ningún paso de simulación.
 */
export class InputSystem {
  /** Fuentes (teclas o botones) que mantienen pulsada cada acción. */
  private readonly held = new Map<Action, Set<string>>();
  private readonly pressed = new Set<Action>();
  private mouseDX = 0;
  private mouseDY = 0;
  private wheel = 0;
  private locked = false;
  private readonly lockListeners = new Set<(locked: boolean) => void>();

  constructor(
    private readonly target: HTMLElement,
    private readonly keyBindings = DEFAULT_KEY_BINDINGS,
    private readonly mouseBindings = DEFAULT_MOUSE_BINDINGS,
  ) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('wheel', this.onWheel, { passive: true });
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    target.addEventListener('contextmenu', this.onContextMenu);
  }

  get pointerLocked(): boolean {
    return this.locked;
  }

  isDown(action: Action): boolean {
    return (this.held.get(action)?.size ?? 0) > 0;
  }

  /** Devuelve si la acción se ha pulsado desde la última consulta, y la marca como consumida. */
  consumePressed(action: Action): boolean {
    return this.pressed.delete(action);
  }

  consumeMouseDelta(): { x: number; y: number } {
    const delta = { x: this.mouseDX, y: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return delta;
  }

  consumeWheel(): number {
    const value = this.wheel;
    this.wheel = 0;
    return value;
  }

  async requestPointerLock(): Promise<void> {
    try {
      // unadjustedMovement desactiva la aceleración del sistema operativo (solo Chromium).
      await this.target.requestPointerLock({ unadjustedMovement: true });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotSupportedError') {
        await this.target.requestPointerLock();
      } else {
        throw error;
      }
    }
  }

  /**
   * Simula la captura del ratón sin pointer lock real. Solo para pruebas automatizadas:
   * los navegadores controlados por Playwright no conceden el pointer lock.
   */
  simulatePointerLock(locked: boolean): void {
    this.setLocked(locked);
  }

  /**
   * Pulsa o suelta una acción sin teclado ni ratón (pruebas automatizadas y modo de grabación de
   * vídeo). Se comporta como una tecla más, con su propia fuente.
   */
  simulateAction(action: Action, down: boolean): void {
    if (down) this.press(action, 'simulated', false);
    else this.release(action, 'simulated');
  }

  exitPointerLock(): void {
    if (document.pointerLockElement === this.target) {
      document.exitPointerLock();
    }
  }

  onPointerLockChanged(listener: (locked: boolean) => void): () => void {
    this.lockListeners.add(listener);
    return () => this.lockListeners.delete(listener);
  }

  /** Suelta todo lo pulsado (al perder el foco o el pointer lock no llegan los keyup). */
  clear(): void {
    this.held.clear();
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
  }

  dispose(): void {
    this.exitPointerLock();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.target.removeEventListener('contextmenu', this.onContextMenu);
    this.lockListeners.clear();
  }

  private press(action: Action, source: string, repeat: boolean): void {
    let sources = this.held.get(action);
    if (!sources) {
      sources = new Set();
      this.held.set(action, sources);
    }
    if (!repeat && !sources.has(source)) {
      this.pressed.add(action);
    }
    sources.add(source);
  }

  private release(action: Action, source: string): void {
    this.held.get(action)?.delete(source);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const action = this.keyBindings[event.code];
    if (!action || !this.locked) return;
    // Evita que Tab cambie el foco, que Espacio haga scroll o que F3 abra la búsqueda.
    event.preventDefault();
    this.press(action, event.code, event.repeat);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const action = this.keyBindings[event.code];
    if (!action) return;
    this.release(action, event.code);
  };

  private readonly onMouseDown = (event: MouseEvent): void => {
    const action = this.mouseBindings[event.button];
    if (!action || !this.locked) return;
    this.press(action, `mouse${event.button}`, false);
  };

  private readonly onMouseUp = (event: MouseEvent): void => {
    const action = this.mouseBindings[event.button];
    if (!action) return;
    this.release(action, `mouse${event.button}`);
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.locked) return;
    this.mouseDX += event.movementX;
    this.mouseDY += event.movementY;
  };

  private readonly onWheel = (event: WheelEvent): void => {
    if (!this.locked) return;
    this.wheel += Math.sign(event.deltaY);
  };

  private readonly onBlur = (): void => {
    this.clear();
  };

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private readonly onPointerLockChange = (): void => {
    this.setLocked(document.pointerLockElement === this.target);
  };

  private setLocked(locked: boolean): void {
    this.locked = locked;
    this.clear();
    for (const listener of this.lockListeners) listener(locked);
  }
}
