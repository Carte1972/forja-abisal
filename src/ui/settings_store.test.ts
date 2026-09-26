import { describe, expect, it } from 'vitest';
import {
  defaultSettings,
  loadSettings,
  sanitizeSettings,
  saveSettings,
  SETTINGS_KEY,
} from './settings_store';

describe('settings_store', () => {
  it('en pantallas Retina renderiza al 75 % por defecto', () => {
    expect(defaultSettings(1).resolutionScale).toBe(1);
    expect(defaultSettings(2).resolutionScale).toBe(0.75);
  });

  it('descarta valores inválidos y limita los rangos', () => {
    const d = defaultSettings();
    const s = sanitizeSettings(
      { fov: 500, volume: -2, headBob: 'sí', pixelate: true, extra: 1 },
      d,
    );
    expect(s.fov).toBe(100);
    expect(s.volume).toBe(0);
    expect(s.headBob).toBe(d.headBob);
    expect(s.pixelate).toBe(true);
    expect('extra' in s).toBe(false);
    expect(sanitizeSettings('basura', d)).toEqual(d);
  });

  it('guarda y vuelve a cargar', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
    };
    const settings = { ...defaultSettings(), fov: 90, invertY: true };
    saveSettings(storage, settings);
    expect(memory.has(SETTINGS_KEY)).toBe(true);
    expect(loadSettings(storage, defaultSettings())).toEqual(settings);
  });

  it('sobrevive a un almacenamiento roto o a JSON corrupto', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(loadSettings(broken, defaultSettings())).toEqual(defaultSettings());
    expect(loadSettings({ getItem: () => '{no es json' }, defaultSettings())).toEqual(
      defaultSettings(),
    );
    expect(() =>
      saveSettings(
        {
          setItem: () => {
            throw new Error('lleno');
          },
        },
        defaultSettings(),
      ),
    ).not.toThrow();
  });
});
