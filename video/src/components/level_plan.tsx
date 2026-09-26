import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { COLORS } from '../theme';

interface LevelPlanProps {
  /** Archivo en public/planos/ (copiado de docs/planos/ por scripts/copy_plans.ts). */
  file: string;
  /** Progreso del dibujo de las líneas (0 a 1). */
  draw: number;
  /** Visibilidad de los suelos y rótulos de las salas (0 a 1). */
  rooms: number;
  /** Escala de las llaves y la salida (0 a 1). */
  markers: number;
  /** Salas encendidas: id del sector y brillo (0 a 1). */
  highlight?: Readonly<Record<string, number>>;
  /** Pulso de alarma en la salida (0 a 1). */
  alarm?: number;
  /** Caja en la que cabe el plano: se ajusta a ella sin deformarse. */
  width: number;
  height: number;
}

/**
 * Plano SVG del nivel (el mismo de INSTRUCCIONES.md), animado con CSS: las líneas se dibujan
 * trazo a trazo, las salas se encienden y las llaves y la salida aparecen al final.
 */
export function LevelPlan({
  file,
  draw,
  rooms,
  markers,
  highlight = {},
  alarm = 0,
  width,
  height,
}: LevelPlanProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [handle] = useState(() => delayRender(`Cargando el plano ${file}`));
  useEffect(() => {
    fetch(staticFile(`planos/${file}`))
      .then((response) => response.text())
      .then((text) => {
        setSvg(text.replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"'));
        continueRender(handle);
      })
      .catch((error: unknown) => {
        console.error(error);
        continueRender(handle);
      });
  }, [file, handle]);

  const id = `plan-${file.replace(/\W/g, '')}`;
  const glow = Object.entries(highlight)
    .filter(([, value]) => value > 0)
    .map(
      ([sector, value]) =>
        `#${id} path[data-sector="${sector}"] { stroke: ${COLORS.emberLight}; stroke-width: ${2 + value * 3}; stroke-opacity: ${value}; filter: drop-shadow(0 0 ${value * 10}px ${COLORS.ember}); }`,
    )
    .join('\n');
  const css = `
    #${id} line { stroke-dasharray: 1000; stroke-dashoffset: ${(1 - draw) * 1000}; }
    #${id} path, #${id} polygon { fill-opacity: ${rooms}; }
    #${id} text { opacity: ${rooms}; }
    #${id} [data-key], #${id} [data-exit] { transform-box: fill-box; transform-origin: center; transform: scale(${markers}); }
    #${id} [data-exit] { filter: drop-shadow(0 0 ${alarm * 14}px ${COLORS.keyRed}); fill: ${alarm > 0.5 ? COLORS.keyRed : '#60ff90'}; }
    ${glow}
  `;
  return (
    <div id={id} style={{ width, height }}>
      <style>{css}</style>
      {svg ? (
        <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />
      ) : null}
    </div>
  );
}
