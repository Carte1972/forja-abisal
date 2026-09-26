# Changelog

Todos los cambios relevantes del proyecto se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sin publicar]

### Fase 1 — Escena base

#### Añadido

- Three.js 0.186 y Rapier 0.21 (`@dimforge/rapier3d-compat`).
- Bucle de juego con física a paso fijo de 60 Hz e interpolación de la cámara en el render.
- Sistema de input: pulsaciones que no se pierden entre frames, pointer lock sin aceleración del ratón (en Chromium) y C/Ctrl para agacharse.
- Jugador con el `KinematicCharacterController` de Rapier:
  - Movimiento arcade con inercia (aceleración y fricción), correr y agacharse.
  - Salto con _coyote time_ y _buffer_ de salto.
  - Sube escalones de hasta 45 cm y rampas de hasta 46°.
  - No se levanta si no cabe de pie.
- Balanceo de cámara al andar y hundimiento al aterrizar.
- Sala de prueba con escaleras, rampas, una rampa demasiado empinada, cajas y una losa baja por la que solo se pasa agachado.
- Pantalla de inicio y pausa provisional (Esc).
- Lanzador `jugar.command` para macOS, con la lógica común en `scripts/launcher.mjs`:
  - Comprueba la versión de Node.
  - Solo instala si falta `node_modules` o cambia el lockfile.
  - Solo compila si cambia el código.
  - Busca un puerto libre y abre el navegador.
- Tests de movimiento del jugador y del acumulador de paso fijo.

#### Cambiado

- Three.js, Rapier y React van en chunks separados en el build.

### Fase 0 — Setup

#### Añadido

- Repositorio git con rama `main`, `.gitignore`, `.gitattributes` y `.editorconfig`.
- Vite 8 + React 19 + TypeScript 6 en modo estricto.
- ESLint (typescript-eslint, react-hooks) y Prettier.
- Vitest con un primer test de utilidades matemáticas.
- Workflow de CI (lint, formato, typecheck y tests en cada push y pull request).
- Workflow de despliegue en GitHub Pages con el `base` de Vite ligado al nombre del repositorio.
- `README.md` inicial, `CLAUDE.md`, `LICENSE` (MIT) y este `CHANGELOG.md`.
