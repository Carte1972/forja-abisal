import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS } from '../theme';

const ROWS: readonly [string, readonly string[]][] = [
  ['Moverse', ['W', 'A', 'S', 'D']],
  ['Mirar y apuntar', ['Ratón']],
  ['Saltar · Agacharse', ['Espacio', 'C']],
  ['Correr', ['Shift']],
  ['Usar', ['E']],
  ['Disparar · Alternativo', ['Clic izq.', 'Clic dcho.']],
  ['Automapa', ['Tab']],
];

/** Tabla de controles: cada fila entra desde la izquierda, una detrás de otra. */
export function ControlsTable({ start, step = 9 }: { start: number; step?: number }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 820 }}>
      {ROWS.map(([action, keys], i) => {
        const t = interpolate(frame - start - i * step, [0, 12], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={action}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 22px',
              background: 'linear-gradient(90deg, rgba(36,38,43,0.92), rgba(20,16,14,0.85))',
              borderLeft: `5px solid ${COLORS.ember}`,
              opacity: t,
              transform: `translateX(${(1 - t) * -60}px)`,
            }}
          >
            <span
              style={{ fontFamily: FONTS.body, fontWeight: 700, fontSize: 40, color: COLORS.text }}
            >
              {action}
            </span>
            <span style={{ display: 'flex', gap: 10 }}>
              {keys.map((key) => (
                <span
                  key={key}
                  style={{
                    fontFamily: FONTS.mono,
                    fontWeight: 500,
                    fontSize: 28,
                    whiteSpace: 'nowrap',
                    color: COLORS.emberLight,
                    padding: '6px 14px',
                    border: `2px solid ${COLORS.metalLight}`,
                    borderBottomWidth: 5,
                    borderRadius: 6,
                    background: COLORS.metal,
                  }}
                >
                  {key}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
