/**
 * Icono del jugador (diseño original): un casco de forja con visor. El visor cambia de color con
 * la salud (cian → ámbar → rojo) y se agrieta al recibir daño; los ojos miran hacia el lado del
 * que llega el daño, se entornan al recoger un arma y se apagan al morir.
 */

const SIZE_W = 40;
const SIZE_H = 44;

export interface FaceState {
  /** Salud de 0 a 1 o más. */
  health: number;
  /** -1 izquierda, 0 centro, 1 derecha. */
  look: -1 | 0 | 1;
  pain: boolean;
  grin: boolean;
  dead: boolean;
  blink: boolean;
}

function visorColor(health: number): string {
  if (health > 0.6) return '#3fe0ff';
  if (health > 0.3) return '#ffb030';
  return '#ff3a20';
}

export class PlayerFace {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private key = '';
  private lookTimer = 0;
  private idleLook: -1 | 0 | 1 = 0;
  private blinkTimer = 2;
  private damageLook: -1 | 0 | 1 = 0;
  private damageLookTimer = 0;
  private painTimer = 0;
  private grinTimer = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SIZE_W;
    this.canvas.height = SIZE_H;
    this.canvas.className = 'hud-face';
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('El navegador no admite canvas 2D');
    this.ctx = ctx;
  }

  /** Daño recibido desde un lado (-1 izquierda, 0 delante o detrás, 1 derecha). */
  hurt(side: -1 | 0 | 1): void {
    this.damageLook = side;
    this.damageLookTimer = 0.8;
    this.painTimer = 0.35;
  }

  grin(): void {
    this.grinTimer = 1.2;
  }

  update(dt: number, health: number, dead: boolean): void {
    this.lookTimer -= dt;
    if (this.lookTimer <= 0) {
      this.lookTimer = 1.5 + Math.random() * 1.5;
      this.idleLook = ([-1, 0, 0, 1] as const)[Math.floor(Math.random() * 4)]!;
    }
    this.blinkTimer -= dt;
    if (this.blinkTimer <= -0.12) this.blinkTimer = 2 + Math.random() * 3;
    this.damageLookTimer -= dt;
    this.painTimer -= dt;
    this.grinTimer -= dt;
    this.draw({
      health,
      look: this.damageLookTimer > 0 ? this.damageLook : this.idleLook,
      pain: this.painTimer > 0,
      grin: this.grinTimer > 0,
      dead,
      blink: this.blinkTimer < 0,
    });
  }

  private draw(state: FaceState): void {
    const level =
      state.health > 0.8
        ? 4
        : state.health > 0.6
          ? 3
          : state.health > 0.4
            ? 2
            : state.health > 0.2
              ? 1
              : 0;
    const key = `${level}|${state.look}|${state.pain}|${state.grin}|${state.dead}|${state.blink}`;
    if (key === this.key) return;
    this.key = key;
    const c = this.ctx;
    c.clearRect(0, 0, SIZE_W, SIZE_H);

    // Casco.
    c.fillStyle = '#4a4f58';
    c.fillRect(6, 4, 28, 34);
    c.fillRect(4, 10, 32, 24);
    c.fillStyle = '#6a707c';
    c.fillRect(8, 4, 24, 3);
    c.fillStyle = '#2c3036';
    c.fillRect(4, 30, 32, 4);
    // Cresta y remaches.
    c.fillStyle = '#c08a30';
    c.fillRect(18, 1, 4, 8);
    c.fillStyle = '#8a8f99';
    for (const [x, y] of [
      [7, 12],
      [31, 12],
      [7, 27],
      [31, 27],
    ] as const)
      c.fillRect(x, y, 2, 2);

    // Visor.
    const visor = state.dead ? '#1a0806' : state.pain ? '#ffffff' : visorColor(state.health);
    c.fillStyle = '#101216';
    c.fillRect(7, 14, 26, 11);
    c.fillStyle = visor;
    c.globalAlpha = state.dead ? 1 : 0.35;
    c.fillRect(8, 15, 24, 9);
    c.globalAlpha = 1;

    // Ojos (LEDs dentro del visor).
    const eyeY = 18;
    const shift = state.look * 3;
    c.fillStyle = state.dead ? '#401010' : state.pain ? '#ffffff' : visor;
    if (state.dead) {
      for (const cx of [14, 26]) {
        c.fillRect(cx - 2, eyeY - 1, 1, 1);
        c.fillRect(cx - 1, eyeY, 2, 1);
        c.fillRect(cx + 1, eyeY + 1, 1, 1);
        c.fillRect(cx + 1, eyeY - 1, 1, 1);
        c.fillRect(cx - 2, eyeY + 1, 1, 1);
      }
    } else if (state.grin) {
      for (const cx of [14 + shift, 26 + shift]) {
        c.fillRect(cx - 2, eyeY + 1, 1, 1);
        c.fillRect(cx - 1, eyeY, 3, 1);
        c.fillRect(cx + 2, eyeY + 1, 1, 1);
      }
    } else if (state.blink) {
      c.fillRect(12 + shift, eyeY + 1, 5, 1);
      c.fillRect(24 + shift, eyeY + 1, 5, 1);
    } else {
      const h = state.pain ? 2 : 3;
      c.fillRect(12 + shift, eyeY, 5, h);
      c.fillRect(24 + shift, eyeY, 5, h);
    }

    // Rejilla de la boca.
    c.fillStyle = '#23262c';
    c.fillRect(13, 27, 14, 5);
    c.fillStyle = '#5a606a';
    for (let x = 14; x < 27; x += 3) c.fillRect(x, 28, 1, 3);

    // Grietas y quemaduras según el daño acumulado.
    c.fillStyle = '#16181c';
    const cracks: [number, number, number, number][] = [
      [9, 6, 1, 6],
      [10, 11, 3, 1],
      [30, 8, 1, 5],
      [28, 25, 4, 1],
      [21, 5, 1, 4],
      [6, 22, 3, 1],
      [33, 18, 1, 5],
      [16, 33, 5, 1],
    ];
    const count = (4 - level) * 2;
    for (let i = 0; i < count; i++) c.fillRect(...cracks[i]!);
    if (level <= 1) {
      c.fillStyle = 'rgba(255, 120, 40, 0.8)';
      c.fillRect(30, 9, 1, 1);
      c.fillRect(10, 12, 1, 1);
    }
  }
}
