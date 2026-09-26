/**
 * Tipos de @kninnug/constrainautor. El paquete publica sus tipos como código TypeScript, que no
 * compila con las opciones estrictas del proyecto; tsconfig apunta aquí mediante "paths".
 */
export interface DelaunatorLike {
  coords: ArrayLike<number>;
  triangles: ArrayLike<number>;
  halfedges: ArrayLike<number>;
  hull: ArrayLike<number>;
}

export default class Constrainautor {
  constructor(del: DelaunatorLike, edges?: readonly [number, number][]);
  constrainOne(segP1: number, segP2: number): number;
  constrainAll(edges: readonly [number, number][]): this;
  delaunify(deep?: boolean): this;
}
