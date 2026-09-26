import type { KeyColor } from '../engine/level/level_types';
import { PlayerFace } from './player_face';

/**
 * HUD en HTML/CSS superpuesto al canvas: barra inferior (salud, blindaje, icono del jugador,
 * munición, llaves y armas), indicador de dirección del daño, destellos y mensajes.
 * Solo toca el DOM cuando un valor cambia.
 */

export interface HudData {
  health: number;
  armor: number;
  weaponName: string;
  /** Munición del cargador (null = sin munición, como el martillo). */
  magazine: number | null;
  reserve: number | null;
  reloading: boolean;
  keys: ReadonlySet<KeyColor>;
  /** Ranura (1-5) → ¿la tiene? */
  owned: readonly boolean[];
  currentSlot: number;
  dead: boolean;
}

const KEY_ORDER: readonly KeyColor[] = ['red', 'blue', 'yellow'];
const MESSAGE_TIME = 3.5;
const MAX_MESSAGES = 4;

interface Indicator {
  element: HTMLDivElement;
  life: number;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  parent?: HTMLElement,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  parent?.appendChild(element);
  return element;
}

/** Actualiza el texto solo si cambia (escribir en el DOM en cada frame es caro). */
function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

export class Hud {
  private readonly root: HTMLDivElement;
  private readonly health: HTMLSpanElement;
  private readonly armor: HTMLSpanElement;
  private readonly ammo: HTMLSpanElement;
  private readonly ammoLabel: HTMLSpanElement;
  private readonly weaponName: HTMLSpanElement;
  private readonly keys: HTMLSpanElement[] = [];
  private readonly slots: HTMLSpanElement[] = [];
  private readonly face = new PlayerFace();
  private readonly damageFlash: HTMLDivElement;
  private readonly pickupFlash: HTMLDivElement;
  private readonly messages: HTMLDivElement;
  private readonly indicatorLayer: HTMLDivElement;
  private readonly indicators: Indicator[] = [];
  private damageIntensity = 0;
  private pickupIntensity = 0;
  private readonly messageTimers = new Map<HTMLElement, number>();
  private lastHealth = -1;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'hud', parent);
    this.damageFlash = el('div', 'hud-flash hud-flash-damage', this.root);
    this.pickupFlash = el('div', 'hud-flash hud-flash-pickup', this.root);
    this.indicatorLayer = el('div', 'hud-indicators', this.root);
    this.messages = el('div', 'hud-messages', this.root);

    const bar = el('div', 'hud-bar', this.root);
    const stat = (label: string, extra = '') => {
      const box = el('div', `hud-box ${extra}`, bar);
      const value = el('span', 'hud-value', box);
      const caption = el('span', 'hud-label', box);
      caption.textContent = label;
      return { value, caption };
    };
    const ammo = stat('MUNICIÓN', 'hud-ammo');
    this.ammo = ammo.value;
    this.ammoLabel = ammo.caption;
    this.health = stat('SALUD').value;
    const faceBox = el('div', 'hud-box hud-face-box', bar);
    faceBox.appendChild(this.face.canvas);
    this.armor = stat('BLINDAJE').value;

    const inventory = el('div', 'hud-box hud-inventory', bar);
    const slotRow = el('div', 'hud-slots', inventory);
    for (let i = 1; i <= 5; i++) {
      const slot = el('span', 'hud-slot', slotRow);
      slot.textContent = String(i);
      this.slots.push(slot);
    }
    const keyRow = el('div', 'hud-keys', inventory);
    for (const color of KEY_ORDER) {
      const key = el('span', `hud-key hud-key-${color}`, keyRow);
      this.keys.push(key);
    }
    this.weaponName = el('span', 'hud-weapon-name', inventory);
  }

  update(dt: number, data: HudData): void {
    setText(this.health, `${Math.max(0, Math.ceil(data.health))}%`);
    setText(this.armor, `${Math.ceil(data.armor)}%`);
    this.health.classList.toggle('hud-low', data.health <= 25);
    setText(this.ammo, data.magazine === null ? '∞' : String(data.magazine));
    setText(
      this.ammoLabel,
      data.reloading
        ? 'RECARGANDO'
        : data.reserve === null
          ? 'MUNICIÓN'
          : `RESERVA ${data.reserve}`,
    );
    setText(this.weaponName, data.weaponName);
    KEY_ORDER.forEach((color, i) =>
      this.keys[i]!.classList.toggle('hud-key-owned', data.keys.has(color)),
    );
    this.slots.forEach((slot, i) => {
      slot.classList.toggle('hud-slot-owned', data.owned[i] ?? false);
      slot.classList.toggle('hud-slot-current', data.currentSlot === i + 1);
    });

    if (this.lastHealth >= 0 && data.health > this.lastHealth + 0.5) this.face.grin();
    this.lastHealth = data.health;
    this.face.update(dt, data.health / 100, data.dead);

    this.damageIntensity = data.dead
      ? Math.min(0.6, this.damageIntensity + dt)
      : Math.max(0, this.damageIntensity - dt * 1.8);
    this.pickupIntensity = Math.max(0, this.pickupIntensity - dt * 2.5);
    this.damageFlash.style.opacity = this.damageIntensity.toFixed(2);
    this.pickupFlash.style.opacity = this.pickupIntensity.toFixed(2);

    for (const indicator of this.indicators) {
      if (indicator.life <= 0) continue;
      indicator.life -= dt;
      indicator.element.style.opacity = Math.max(0, Math.min(1, indicator.life / 0.6)).toFixed(2);
    }
    for (const [message, remaining] of this.messageTimers) {
      const left = remaining - dt;
      if (left <= 0) {
        message.remove();
        this.messageTimers.delete(message);
      } else {
        this.messageTimers.set(message, left);
        if (left < 0.5) message.style.opacity = (left / 0.5).toFixed(2);
      }
    }
  }

  /**
   * Daño recibido. `angle` es la dirección de la que viene respecto a hacia donde mira el
   * jugador (radianes, 0 = delante, positivo = izquierda), o null si no tiene dirección.
   */
  damage(amount: number, angle: number | null): void {
    this.damageIntensity = Math.min(0.75, this.damageIntensity + 0.2 + amount / 60);
    if (angle === null) {
      this.face.hurt(0);
      return;
    }
    this.face.hurt(
      Math.abs(angle) < 0.6 || Math.abs(angle) > Math.PI - 0.6 ? 0 : angle > 0 ? -1 : 1,
    );
    let indicator = this.indicators.find((i) => i.life <= 0);
    if (!indicator) {
      if (this.indicators.length >= 4) indicator = this.indicators[0]!;
      else {
        indicator = { element: el('div', 'hud-indicator', this.indicatorLayer), life: 0 };
        this.indicators.push(indicator);
      }
    }
    indicator.life = 1.2;
    // El indicador gira alrededor del centro de la pantalla; 0 = arriba.
    indicator.element.style.transform = `rotate(${(-angle * 180) / Math.PI}deg)`;
  }

  pickup(color: number): void {
    this.pickupIntensity = 0.35;
    this.pickupFlash.style.background = `#${color.toString(16).padStart(6, '0')}`;
  }

  message(text: string, color = 0xffe0c0): void {
    const message = el('div', 'hud-message', this.messages);
    message.textContent = text;
    message.style.color = `#${color.toString(16).padStart(6, '0')}`;
    this.messageTimers.set(message, MESSAGE_TIME);
    while (this.messages.children.length > MAX_MESSAGES) {
      const oldest = this.messages.firstElementChild as HTMLElement;
      this.messageTimers.delete(oldest);
      oldest.remove();
    }
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  dispose(): void {
    this.root.remove();
  }
}
