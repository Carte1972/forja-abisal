/**
 * Temporización de las acciones escenificadas de un clip (puro).
 *
 * Cada acción empieza en `at` segundos y, si se mantiene (`hold`), termina `hold` segundos
 * después. Se traducen a pasos de simulación: el paso `n` es el instante `n / fps`. Así las
 * acciones caen siempre en el mismo paso, vaya rápido o lento el ordenador.
 */

export interface TimedAction {
  /** Segundos desde el inicio del clip. */
  at: number;
  /** Segundos que se mantiene. Sin él, dura un solo paso (un toque). */
  hold?: number;
}

export interface TimelineEvent<A extends TimedAction> {
  step: number;
  phase: 'start' | 'end';
  action: A;
}

/** Número de fotogramas (y pasos) de un clip. */
export function frameCount(duration: number, fps: number): number {
  return Math.max(1, Math.round(duration * fps));
}

/** Paso en el que cae un instante: el más cercano. */
export function stepAt(seconds: number, fps: number): number {
  return Math.max(0, Math.round(seconds * fps));
}

/**
 * Eventos de inicio y fin de todas las acciones, ordenados por paso. En un mismo paso, los
 * finales van antes que los inicios (soltar una tecla y volver a pulsarla funciona) y, dentro de
 * cada grupo, se respeta el orden en que se escribieron las acciones.
 */
export function buildTimeline<A extends TimedAction>(
  actions: readonly A[],
  fps: number,
): TimelineEvent<A>[] {
  const events: (TimelineEvent<A> & { order: number })[] = [];
  actions.forEach((action, order) => {
    const start = stepAt(action.at, fps);
    const end = Math.max(start + 1, stepAt(action.at + (action.hold ?? 0), fps));
    events.push({ step: start, phase: 'start', action, order });
    events.push({ step: end, phase: 'end', action, order });
  });
  events.sort(
    (a, b) =>
      a.step - b.step ||
      (a.phase === b.phase ? 0 : a.phase === 'end' ? -1 : 1) ||
      a.order - b.order,
  );
  return events.map(({ step, phase, action }) => ({ step, phase, action }));
}

/** Recorre una línea de tiempo paso a paso sin buscar desde el principio cada vez. */
export class TimelineCursor<A extends TimedAction> {
  private next = 0;

  constructor(private readonly events: readonly TimelineEvent<A>[]) {}

  /** Eventos del paso `step`. Hay que pedirlos en orden creciente de paso. */
  take(step: number): TimelineEvent<A>[] {
    const out: TimelineEvent<A>[] = [];
    while (this.next < this.events.length && this.events[this.next]!.step <= step) {
      out.push(this.events[this.next]!);
      this.next++;
    }
    return out;
  }
}
