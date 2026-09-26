# Forja Abisal

FPS 3D retro para el navegador, hecho con Three.js y Rapier. Tiene el ritmo de los shooters de los 90: niveles laberínticos y verticales, muchos enemigos, llaves y secretos. Todo el contenido (modelos, texturas, sonidos, niveles y nombres) es original y se genera por código.

<!-- CAPTURA: añade aquí una captura o GIF del juego, por ejemplo: ![Forja Abisal](docs/captura.gif) -->

> **Demo:** https://&lt;usuario&gt;.github.io/&lt;repositorio&gt;/ _(disponible cuando se publique el repositorio)_

> 🚧 **Estado:** en desarrollo. Fase actual: **1 — Escena base**. Hay una sala de prueba para moverse, saltar y agacharse; todavía no hay armas ni enemigos.

## Controles

| Acción              | Tecla             | Estado       |
| ------------------- | ----------------- | ------------ |
| Moverse             | W A S D / flechas | ✅           |
| Mirar               | Ratón             | ✅           |
| Saltar              | Espacio           | ✅           |
| Agacharse           | C (o Ctrl)        | ✅           |
| Correr              | Shift             | ✅           |
| Pausa               | Esc               | ✅           |
| Disparar            | Clic izquierdo    | Próximamente |
| Disparo alternativo | Clic derecho      | Próximamente |
| Cambiar de arma     | 1-5 / rueda       | Próximamente |
| Usar                | E                 | Próximamente |
| Automapa            | Tab               | Próximamente |
| Estadísticas        | F3                | Próximamente |

> **¿Por qué C para agacharse?** En los navegadores, Ctrl+W cierra la pestaña y una página web no puede impedirlo. Ctrl también funciona, pero C es más seguro.

## Instalación y ejecución

### Opción rápida: doble clic

- **macOS:** haz doble clic en `jugar.command`.

El lanzador comprueba que tienes Node.js, instala las dependencias y compila el juego (solo la primera vez o cuando algo cambia). Después lo sirve en un puerto libre y abre tu navegador. En la terminal verás la URL. Para cerrar el juego, pulsa Ctrl+C o cierra la ventana.

### Opción manual

Requisitos: [Node.js](https://nodejs.org/es/download) **22.12 o superior** (se recomienda la versión LTS).

```bash
npm install
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run build     # build de producción en dist/
npm run preview   # sirve dist/ en local
```

### Solución de problemas

- **macOS dice que no puede abrir `jugar.command` porque es de un desarrollador no identificado.** La primera vez, haz clic derecho sobre el archivo → **Abrir** → **Abrir**. A partir de ahí, el doble clic funciona. Si no aparece la opción, ve a Ajustes del Sistema → Privacidad y seguridad → **Abrir igualmente**.
- **"No se ha encontrado Node.js" o "versión demasiado antigua".** Instala la versión LTS desde [nodejs.org](https://nodejs.org/es/download) y vuelve a abrir el lanzador.
- **Puerto ocupado.** El lanzador busca solo un puerto libre a partir del 4173. Con `npm run dev`, si el 5173 está ocupado, Vite usa el siguiente y lo indica en la terminal.
- **El ratón no queda capturado.** Haz clic dentro del juego. Si acabas de pulsar Esc, espera un segundo antes de volver a hacer clic: el navegador impone esa pausa.

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
- En desarrollo, `window.__forja` da acceso al juego desde la consola. Por ejemplo, `__forja.debugState()` muestra la posición y la velocidad del jugador, y `__forja.debugSetPlaying(true)` entra en modo juego sin capturar el ratón (útil para pruebas automatizadas).

## Créditos y licencia

Todo el contenido es original y se genera por código: no se usan assets, nombres ni niveles de otros juegos.

Publicado bajo licencia [MIT](LICENSE).
