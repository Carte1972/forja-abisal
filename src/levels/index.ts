import level01 from './level_01.json';
import level02 from './level_02.json';
import level03 from './level_03.json';

export interface LevelEntry {
  id: string;
  /** Nombre que se muestra (también está dentro del JSON). */
  name: string;
  data: unknown;
}

/** Niveles de la campaña, en orden. Se generan con `npm run levels` desde scripts/levels/. */
export const LEVELS: readonly LevelEntry[] = [
  { id: 'level_01', name: 'Fundición Cero', data: level01 },
  { id: 'level_02', name: 'Pozos de Ceniza', data: level02 },
  { id: 'level_03', name: 'Núcleo Abisal', data: level03 },
];
