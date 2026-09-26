import type * as THREE from 'three';
import { approach, clamp } from '../../engine/core/math_utils';
import type { Rng } from '../../engine/core/rng';
import type { FireMode, FireModeDef, WeaponId } from './weapon_defs';
import type { Viewmodel } from './viewmodels';

export interface ViewmodelContext {
  /** Movimiento del ratón en píxeles este frame. */
  lookDX: number;
  lookDY: number;
  horizontalSpeed: number;
  grounded: boolean;
  /** Si se desactiva el balanceo en opciones, el arma tampoco se mece al andar. */
  bobEnabled: boolean;
}

interface Timeline {
  t: number;
  duration: number;
}

/** Sube rápido, se mantiene y baja: la forma de una animación de recarga. */
function envelope(p: number): number {
  const rise = clamp(p / 0.2, 0, 1);
  const fall = clamp((1 - p) / 0.25, 0, 1);
  const x = Math.min(rise, fall);
  return x * x * (3 - 2 * x);
}

/**
 * Animación procedural del arma en primera persona: balanceo al mirar y al andar, retroceso,
 * fogonazo, recarga, cambio de arma y golpes del martillo.
 */
export class ViewmodelAnimator {
  private current: WeaponId;
  private readonly baseRotation = new Map<WeaponId, THREE.Euler>();
  private swayX = 0;
  private swayY = 0;
  private bobPhase = 0;
  private bobAmount = 0;
  private kick = 0;
  private hiddenAmount = 0;
  private hideTarget = 0;
  private hideSpeed = 1;
  private reload: Timeline | null = null;
  private swing: (Timeline & { heavy: boolean }) | null = null;
  private flashTimer = 0;
  private drumSpeed = 0;
  private breathe = 0;

  constructor(
    private readonly models: Record<WeaponId, Viewmodel>,
    scene: THREE.Scene,
    initial: WeaponId,
    private readonly rng: Rng,
  ) {
    for (const [id, model] of Object.entries(models) as [WeaponId, Viewmodel][]) {
      this.baseRotation.set(id, model.root.rotation.clone());
      model.root.visible = id === initial;
      scene.add(model.root);
    }
    this.current = initial;
  }

  get muzzle(): THREE.Object3D {
    return this.models[this.current].muzzle;
  }

  onFire(weapon: WeaponId, mode: FireMode, def: FireModeDef): void {
    if (weapon !== this.current) return;
    if (def.kind === 'melee') {
      this.swing = { t: 0, duration: def.cooldown * 0.85, heavy: mode === 'alt' };
      return;
    }
    this.kick = Math.min(this.kick + def.recoil * 6, 0.35);
    this.flashTimer = 0.05;
    const flash = this.models[weapon].flash;
    flash.rotation.z = this.rng.range(0, Math.PI);
    flash.scale.setScalar(this.rng.range(0.8, 1.25));
    if (weapon === 'riveter') this.drumSpeed = 30;
  }

  onReloadStart(duration: number): void {
    this.reload = { t: 0, duration };
  }

  onLower(duration: number): void {
    this.reload = null;
    this.hideTarget = 1;
    this.hideSpeed = 1 / Math.max(duration, 0.01);
  }

  onRaise(weapon: WeaponId, duration: number): void {
    this.models[this.current].root.visible = false;
    this.current = weapon;
    this.models[weapon].root.visible = true;
    this.hiddenAmount = 1;
    this.hideTarget = 0;
    this.hideSpeed = 1 / Math.max(duration, 0.01);
    this.swing = null;
  }

  update(dt: number, ctx: ViewmodelContext): void {
    const model = this.models[this.current];
    const base = this.baseRotation.get(this.current)!;

    this.swayX += (clamp(-ctx.lookDX * 0.0005, -0.05, 0.05) - this.swayX) * Math.min(1, dt * 9);
    this.swayY += (clamp(ctx.lookDY * 0.0005, -0.04, 0.04) - this.swayY) * Math.min(1, dt * 9);
    const moving = ctx.grounded && ctx.bobEnabled ? clamp(ctx.horizontalSpeed / 7, 0, 1.4) : 0;
    this.bobAmount = approach(this.bobAmount, moving, dt * 4);
    this.bobPhase += dt * (3 + ctx.horizontalSpeed * 1.1);
    this.breathe += dt;
    this.kick *= Math.exp(-dt * 11);
    this.hiddenAmount = approach(this.hiddenAmount, this.hideTarget, dt * this.hideSpeed);

    let reloadDip = 0;
    let reloadTilt = 0;
    let barrelsOpen = 0;
    if (this.reload) {
      this.reload.t += dt;
      const p = this.reload.t / this.reload.duration;
      const e = envelope(Math.min(p, 1));
      if (this.current === 'shotgun') {
        // Se abre la báscula y se levanta el arma para enseñar la recámara.
        barrelsOpen = e * 0.7;
        reloadDip = -e * 0.06;
        reloadTilt = e * 0.25;
      } else {
        reloadDip = e * 0.12;
        reloadTilt = e * 0.45;
      }
      if (p >= 1) this.reload = null;
    }

    let swingAngle = 0;
    if (this.swing) {
      this.swing.t += dt;
      const p = this.swing.t / this.swing.duration;
      // Toma impulso hacia atrás y descarga el golpe hacia delante y abajo.
      const windUp = p < 0.35 ? Math.sin((p / 0.35) * (Math.PI / 2)) : 1 - (p - 0.35) / 0.2;
      const strike = p < 0.35 ? 0 : Math.sin(clamp((p - 0.35) / 0.65, 0, 1) * Math.PI);
      swingAngle = (this.swing.heavy ? 1.5 : 1) * (clamp(windUp, 0, 1) * 0.5 - strike * 1.1);
      if (p >= 1) this.swing = null;
    }

    const bobX = Math.sin(this.bobPhase) * 0.014 * this.bobAmount;
    const bobY = -Math.abs(Math.cos(this.bobPhase)) * 0.012 * this.bobAmount;
    const breath = Math.sin(this.breathe * 1.6) * 0.003;
    model.root.position.set(
      model.rest.x + this.swayX + bobX,
      model.rest.y + this.swayY + bobY + breath - reloadDip - this.hiddenAmount * 0.45,
      model.rest.z + this.kick * 0.25,
    );
    model.root.rotation.set(
      base.x +
        this.kick * 1.4 -
        reloadDip * 1.5 +
        swingAngle +
        (barrelsOpen > 0 ? barrelsOpen * 0.6 : 0),
      base.y + this.swayX * 1.5,
      base.z + reloadTilt + this.swayX * 0.8 - swingAngle * 0.3,
    );

    if (model.parts.barrels) model.parts.barrels.rotation.x = -barrelsOpen;
    if (model.parts.drum) {
      model.parts.drum.rotation.z += this.drumSpeed * dt;
      this.drumSpeed = approach(this.drumSpeed, 0, dt * 25);
    }
    this.flashTimer -= dt;
    model.flash.visible = this.flashTimer > 0;
  }

  /** Oculta o muestra todas las armas (por ejemplo, al morir). */
  setVisible(visible: boolean): void {
    this.models[this.current].root.visible = visible;
  }
}
