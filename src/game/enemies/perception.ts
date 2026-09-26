import type { Vec3 } from '../../engine/physics/physics_world';

/**
 * ¿Está `target` dentro del cono de visión de alguien en `eye` que mira con orientación `yaw`?
 * El cono es horizontal (ángulo total `fovDeg`) y se ignora la altura: los enemigos ven hacia
 * arriba y hacia abajo sin límite. `yaw` 0 mira a -Z, como la cámara.
 */
export function inViewCone(
  eye: Vec3,
  yaw: number,
  target: Vec3,
  fovDeg: number,
  maxDistance: number,
): boolean {
  const dx = target.x - eye.x;
  const dz = target.z - eye.z;
  const distance = Math.hypot(dx, target.y - eye.y, dz);
  if (distance > maxDistance) return false;
  const horizontal = Math.hypot(dx, dz);
  if (horizontal < 1e-6) return true;
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const cos = (dx * fx + dz * fz) / horizontal;
  return cos >= Math.cos(((fovDeg / 2) * Math.PI) / 180);
}

/** Orientación (yaw) que mira desde `from` hacia `to`. */
export function yawTowards(from: Vec3, to: Vec3): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

/** Gira `current` hacia `target` como mucho `maxStep` radianes, por el camino más corto. */
export function turnTowards(current: number, target: number, maxStep: number): number {
  let delta = target - current;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}
