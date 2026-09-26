# Forja Abisal

FPS 3D retro para el navegador, hecho con Three.js y Rapier. Tiene el ritmo de los shooters de los 90: niveles laberínticos y verticales, muchos enemigos, llaves y secretos. Todo el contenido (modelos, texturas, sonidos, niveles y nombres) es original y se genera por código.

<!-- CAPTURA: añade aquí una captura o GIF del juego, por ejemplo: ![Forja Abisal](docs/captura.gif) -->

> **Demo:** https://&lt;usuario&gt;.github.io/&lt;repositorio&gt;/ _(disponible cuando se publique el repositorio)_

> 🚧 **Estado:** en desarrollo. Fase actual: **0 — Setup**. Aún no hay juego jugable.

## Instalación y ejecución

### Requisitos

- [Node.js](https://nodejs.org/) **22.12 o superior** (se recomienda la versión LTS).

### Opción manual

```bash
npm install
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run build     # build de producción en dist/
npm run preview   # sirve dist/ en local
```

## Desarrollo

| Script               | Qué hace                                       |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Servidor de desarrollo con recarga en caliente |
| `npm run build`      | Typecheck + build de producción en `dist/`     |
| `npm run preview`    | Sirve el build de producción                   |
| `npm test`           | Ejecuta los tests (Vitest)                     |
| `npm run test:watch` | Tests en modo observación                      |
| `npm run lint`       | ESLint                                         |
| `npm run format`     | Formatea el código con Prettier                |
| `npm run typecheck`  | Comprobación de tipos de TypeScript            |

- Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/) (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- La CI ejecuta lint, formato, typecheck y tests en cada push y pull request. Cada push a `main` se despliega en GitHub Pages.

## Créditos y licencia

Todo el contenido es original y se genera por código: no se usan assets, nombres ni niveles de otros juegos.

Publicado bajo licencia [MIT](LICENSE).
