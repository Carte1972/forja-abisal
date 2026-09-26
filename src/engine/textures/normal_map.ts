/**
 * Normal map en espacio tangente a partir de un mapa de alturas (0..1) con el operador de
 * Sobel. Los bordes se envuelven para que el normal map también se repita sin costuras.
 * Devuelve RGBA; (128, 128, 255) es una superficie plana.
 */
export function normalMapFromHeight(
  height: Float32Array,
  size: number,
  strength: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 4);
  const at = (x: number, y: number) =>
    height[(((y % size) + size) % size) * size + (((x % size) + size) % size)]!;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        at(x + 1, y - 1) +
        2 * at(x + 1, y) +
        at(x + 1, y + 1) -
        (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      // En el canvas la Y crece hacia abajo y en UV hacia arriba: se invierte el gradiente.
      const dy =
        at(x - 1, y - 1) +
        2 * at(x, y - 1) +
        at(x + 1, y - 1) -
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));
      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1;
      const length = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      out[i] = ((nx / length) * 0.5 + 0.5) * 255;
      out[i + 1] = ((ny / length) * 0.5 + 0.5) * 255;
      out[i + 2] = ((nz / length) * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
  return out;
}
