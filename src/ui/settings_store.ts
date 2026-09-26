/**
 * Ajustes del jugador, con valores por defecto, validación y guardado en localStorage.
 * La validación es pura (sin DOM) para poder testearla.
 */

export interface Settings {
  /** Multiplicador de la sensibilidad del ratón (1 = normal). */
  mouseSensitivity: number;
  invertY: boolean;
  /** Campo de visión vertical en grados. */
  fov: number;
  /** Volumen general, de 0 a 1. */
  volume: number;
  headBob: boolean;
  recoil: boolean;
  shadows: boolean;
  postProcessing: boolean;
  /** Filtro retro de píxeles grandes. */
  pixelate: boolean;
  /** Escala de resolución del render (0,5 a 1). */
  resolutionScale: number;
  showFps: boolean;
}

export const SETTINGS_KEY = 'forja-abisal:ajustes';

/**
 * Valores por defecto. En pantallas de alta densidad (Retina) se renderiza al 75 %: la diferencia
 * apenas se nota con el aspecto retro y la GPU trabaja casi la mitad.
 */
export function defaultSettings(devicePixelRatio = 1): Settings {
  return {
    mouseSensitivity: 1,
    invertY: false,
    fov: 75,
    volume: 0.8,
    headBob: true,
    recoil: true,
    shadows: true,
    postProcessing: true,
    pixelate: false,
    resolutionScale: devicePixelRatio >= 2 ? 0.75 : 1,
    showFps: false,
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Combina lo guardado con los valores por defecto, descartando lo que no sea válido. */
export function sanitizeSettings(raw: unknown, defaults: Settings): Settings {
  const result = { ...defaults };
  if (typeof raw !== 'object' || raw === null) return result;
  const input = raw as Record<string, unknown>;
  const number = (key: keyof Settings, min: number, max: number) => {
    const value = input[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      (result[key] as number) = clamp(value, min, max);
    }
  };
  const boolean = (key: keyof Settings) => {
    if (typeof input[key] === 'boolean') (result[key] as boolean) = input[key];
  };
  number('mouseSensitivity', 0.2, 3);
  number('fov', 60, 100);
  number('volume', 0, 1);
  number('resolutionScale', 0.5, 1);
  for (const key of [
    'invertY',
    'headBob',
    'recoil',
    'shadows',
    'postProcessing',
    'pixelate',
    'showFps',
  ] as const) {
    boolean(key);
  }
  return result;
}

/** Lee los ajustes guardados. El almacenamiento puede no estar disponible (modo privado...). */
export function loadSettings(
  storage: Pick<Storage, 'getItem'> | null,
  defaults: Settings,
): Settings {
  try {
    const text = storage?.getItem(SETTINGS_KEY);
    return sanitizeSettings(text ? JSON.parse(text) : null, defaults);
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(storage: Pick<Storage, 'setItem'> | null, settings: Settings): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Sin almacenamiento, los ajustes duran solo esta sesión.
  }
}

export function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
