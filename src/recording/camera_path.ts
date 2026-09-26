/**
 * Recorridos de cámara del modo de grabación (puro, sin Three.js).
 *
 * Un recorrido es una lista de puntos clave en el tiempo. La posición, el punto al que se mira y
 * los ángulos se interpolan con curvas de Hermite cúbicas cuyas tangentes salen de los vecinos
 * (Catmull-Rom con tiempos no uniformes), así la velocidad es continua aunque los tramos duren
 * distinto. Un suavizado global (`easing`) arranca y frena el recorrido sin tirones.
 */

export type Vec3Tuple = readonly [number, number, number];

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type Easing = 'linear' | 'in' | 'out' | 'in-out';

export interface CameraKey {
  /** Segundos desde el inicio del clip. */
  t: number;
  /** Posición del ojo en metros. Obligatoria en la cámara libre; con el jugador se ignora. */
  pos?: Vec3Tuple;
  /** Punto al que se mira. Alternativa a `yaw` y `pitch`; todas las claves deben usar lo mismo. */
  look?: Vec3Tuple;
  /** Grados. 0 mira al norte (-Z) y crece hacia el oeste, como en los niveles. */
  yaw?: number;
  /** Grados. Positivo hacia arriba. */
  pitch?: number;
}

export interface CameraPath {
  keys: readonly CameraKey[];
  /** Cómo arranca y frena el recorrido completo. Por defecto, `in-out`. */
  easing?: Easing;
}

export interface CameraSample {
  /** Posición interpolada, o `null` si las claves no tienen posición. */
  pos: Vec3 | null;
  /** Radianes, con el mismo convenio que `Player.yaw` y `Player.pitch`. */
  yaw: number;
  pitch: number;
}

const DEG = Math.PI / 180;

export function applyEasing(u: number, easing: Easing): number {
  const x = Math.min(1, Math.max(0, u));
  switch (easing) {
    case 'linear':
      return x;
    case 'in':
      return x * x;
    case 'out':
      return 1 - (1 - x) * (1 - x);
    case 'in-out':
      return x * x * (3 - 2 * x);
  }
}

/** Orientación (radianes) para mirar desde `from` hacia `to`. */
export function lookAngles(from: Vec3, to: Vec3): { yaw: number; pitch: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

/**
 * Mezcla dos orientaciones (radianes) por el camino corto: `weight` 0 da `a` y 1 da `b`.
 */
export function blendAngles(
  a: { yaw: number; pitch: number },
  b: { yaw: number; pitch: number },
  weight: number,
): { yaw: number; pitch: number } {
  const [, yawB] = unwrapAngles([a.yaw, b.yaw]);
  return { yaw: a.yaw + (yawB! - a.yaw) * weight, pitch: a.pitch + (b.pitch - a.pitch) * weight };
}

/**
 * Peso de un intervalo [from, to] con entrada y salida suaves de `ramp` segundos: 0 fuera, 1
 * dentro, y una curva suave en los bordes (empieza a subir en `from` y baja a partir de `to`).
 */
export function windowWeight(t: number, from: number, to: number, ramp: number): number {
  if (t <= from || t >= to + ramp) return 0;
  const rise = applyEasing((t - from) / ramp, 'in-out');
  const fall = t <= to ? 1 : 1 - applyEasing((t - to) / ramp, 'in-out');
  return Math.min(rise, fall);
}

/** Deshace los saltos de ±2π entre ángulos consecutivos para girar siempre por el camino corto. */
export function unwrapAngles(angles: readonly number[]): number[] {
  const out: number[] = [];
  for (const angle of angles) {
    if (out.length === 0) {
      out.push(angle);
      continue;
    }
    const previous = out[out.length - 1]!;
    let delta = angle - previous;
    delta -= 2 * Math.PI * Math.round(delta / (2 * Math.PI));
    out.push(previous + delta);
  }
  return out;
}

/** Errores de un recorrido (lista vacía si es válido). */
export function validateCameraPath(path: CameraPath, needsPosition: boolean): string[] {
  const errors: string[] = [];
  const keys = path.keys;
  if (keys.length === 0) return ['El recorrido no tiene claves.'];
  keys.forEach((key, i) => {
    if (i > 0 && key.t <= keys[i - 1]!.t) {
      errors.push(`Clave ${i}: el tiempo ${key.t} debe ser mayor que el de la anterior.`);
    }
    if (needsPosition && !key.pos) errors.push(`Clave ${i}: falta la posición (pos).`);
    const hasLook = key.look !== undefined;
    const hasAngles = key.yaw !== undefined;
    if (hasLook === hasAngles) {
      errors.push(`Clave ${i}: indica o bien look o bien yaw (y pitch opcional).`);
    }
  });
  const usesLook = keys[0]!.look !== undefined;
  if (keys.some((key) => (key.look !== undefined) !== usesLook)) {
    errors.push('Todas las claves deben usar look, o todas yaw y pitch.');
  }
  return errors;
}

/**
 * Muestra el recorrido en el instante `t` (segundos). Antes de la primera clave y después de la
 * última, se queda quieto en ellas. `eye` es la posición real del ojo cuando la cámara la pone el
 * jugador: sirve para orientar hacia los puntos `look`.
 */
export function sampleCameraPath(path: CameraPath, t: number, eye?: Vec3): CameraSample {
  const keys = path.keys;
  const first = keys[0]!;
  const last = keys[keys.length - 1]!;
  const span = last.t - first.t;
  const eased =
    span > 0
      ? first.t + applyEasing((t - first.t) / span, path.easing ?? 'in-out') * span
      : first.t;
  const times = keys.map((key) => key.t);

  const pos = keys.every((key) => key.pos)
    ? interpolateVector(
        times,
        keys.map((key) => key.pos!),
        eased,
      )
    : null;

  if (first.look) {
    const target = interpolateVector(
      times,
      keys.map((key) => key.look!),
      eased,
    );
    const from = eye ?? pos;
    if (!from) throw new Error('Para mirar a un punto (look) hace falta la posición del ojo.');
    return { pos, ...lookAngles(from, target) };
  }
  const yaws = unwrapAngles(keys.map((key) => (key.yaw ?? 0) * DEG));
  const pitches = keys.map((key) => (key.pitch ?? 0) * DEG);
  return {
    pos,
    yaw: interpolateScalar(times, yaws, eased),
    pitch: interpolateScalar(times, pitches, eased),
  };
}

function interpolateVector(
  times: readonly number[],
  points: readonly Vec3Tuple[],
  t: number,
): Vec3 {
  const axis = (i: 0 | 1 | 2) =>
    interpolateScalar(
      times,
      points.map((p) => p[i]),
      t,
    );
  return { x: axis(0), y: axis(1), z: axis(2) };
}

/** Hermite cúbica con tangentes de Catmull-Rom para tiempos no uniformes. */
export function interpolateScalar(
  times: readonly number[],
  values: readonly number[],
  t: number,
): number {
  const n = values.length;
  if (n === 1 || t <= times[0]!) return values[0]!;
  if (t >= times[n - 1]!) return values[n - 1]!;
  let i = 0;
  while (t > times[i + 1]!) i++;
  const t0 = times[i]!;
  const t1 = times[i + 1]!;
  const dt = t1 - t0;
  const u = (t - t0) / dt;
  const tangent = (k: number) => {
    const prev = Math.max(0, k - 1);
    const next = Math.min(n - 1, k + 1);
    return (values[next]! - values[prev]!) / (times[next]! - times[prev]!);
  };
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * values[i]! +
    (u3 - 2 * u2 + u) * dt * tangent(i) +
    (-2 * u3 + 3 * u2) * values[i + 1]! +
    (u3 - u2) * dt * tangent(i + 1)
  );
}
