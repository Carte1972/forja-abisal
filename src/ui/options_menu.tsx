import type { ReactNode } from 'react';
import { defaultSettings, type Settings } from './settings_store';

interface OptionsMenuProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
}

function Toggle(props: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="option-row">
      <span>{props.label}</span>
      <input
        type="checkbox"
        checked={props.value}
        onChange={(event) => props.onChange(event.target.checked)}
      />
    </label>
  );
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="option-row">
      <span>{props.label}</span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
      <output>{props.format(props.value)}</output>
    </label>
  );
}

function Group(props: { title: string; children: ReactNode }) {
  return (
    <fieldset className="option-group">
      <legend>{props.title}</legend>
      {props.children}
    </fieldset>
  );
}

const percent = (value: number) => `${Math.round(value * 100)} %`;

/** Opciones del juego. Los cambios se aplican y se guardan al momento. */
export function OptionsMenu({ settings, onChange, onClose }: OptionsMenuProps) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value });
  return (
    <div className="menu-panel">
      <h2>Opciones</h2>
      <div className="options-grid">
        <Group title="Controles">
          <Slider
            label="Sensibilidad del ratón"
            value={settings.mouseSensitivity}
            min={0.2}
            max={3}
            step={0.05}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) => set('mouseSensitivity', v)}
          />
          <Toggle
            label="Invertir eje vertical"
            value={settings.invertY}
            onChange={(v) => set('invertY', v)}
          />
        </Group>
        <Group title="Cámara">
          <Slider
            label="Campo de visión"
            value={settings.fov}
            min={60}
            max={100}
            step={1}
            format={(v) => `${v}°`}
            onChange={(v) => set('fov', v)}
          />
          <Toggle
            label="Balanceo al andar"
            value={settings.headBob}
            onChange={(v) => set('headBob', v)}
          />
          <Toggle
            label="Retroceso al disparar"
            value={settings.recoil}
            onChange={(v) => set('recoil', v)}
          />
        </Group>
        <Group title="Sonido">
          <Slider
            label="Volumen"
            value={settings.volume}
            min={0}
            max={1}
            step={0.05}
            format={percent}
            onChange={(v) => set('volume', v)}
          />
        </Group>
        <Group title="Gráficos">
          <Toggle label="Sombras" value={settings.shadows} onChange={(v) => set('shadows', v)} />
          <Toggle
            label="Post-procesado (brillo y viñeta)"
            value={settings.postProcessing}
            onChange={(v) => set('postProcessing', v)}
          />
          <Toggle
            label="Filtro de píxeles retro"
            value={settings.pixelate}
            onChange={(v) => set('pixelate', v)}
          />
          <Slider
            label="Resolución"
            value={settings.resolutionScale}
            min={0.5}
            max={1}
            step={0.05}
            format={percent}
            onChange={(v) => set('resolutionScale', v)}
          />
          <Toggle
            label="Mostrar rendimiento (F3)"
            value={settings.showFps}
            onChange={(v) => set('showFps', v)}
          />
        </Group>
      </div>
      <div className="menu-actions">
        <button type="button" className="menu-button" onClick={onClose}>
          Volver
        </button>
        <button
          type="button"
          className="menu-button menu-button-secondary"
          onClick={() => onChange(defaultSettings(window.devicePixelRatio))}
        >
          Restaurar valores
        </button>
      </div>
    </div>
  );
}
