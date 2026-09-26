import { LEVELS, type LevelEntry } from '../levels/index';
import testLevel from '../levels/test_level.json';

/** Nivel de pruebas, accesible con `?nivel=prueba` (no forma parte de la campaña). */
export const TEST_LEVEL: LevelEntry = {
  id: 'test_level',
  name: 'Nivel de pruebas',
  data: testLevel,
};

/**
 * Nivel inicial según la URL: `?nivel=2` empieza en el segundo nivel y `?nivel=prueba` carga el
 * nivel de pruebas. Devuelve el índice en la campaña, o -1 para el nivel de pruebas.
 */
export function initialLevelIndex(search: string): number {
  const value = new URLSearchParams(search).get('nivel');
  if (value === 'prueba') return -1;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= LEVELS.length ? n - 1 : 0;
}

export function levelAt(index: number): LevelEntry {
  return index < 0 ? TEST_LEVEL : LEVELS[index]!;
}

/** Siguiente nivel de la campaña, o null si era el último (o el de pruebas). */
export function nextLevelIndex(index: number): number | null {
  return index >= 0 && index + 1 < LEVELS.length ? index + 1 : null;
}
