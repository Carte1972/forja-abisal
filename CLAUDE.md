# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Fuente de verdad

`especificacion_proyecto.md` es la especificación completa de **Forja Abisal** (FPS 3D retro en el navegador con Three.js). **Léela entera antes de empezar cualquier fase y consúltala en cada una. No la modifiques** (está en `.prettierignore` para que no se reformatee). Si algo es contradictorio, ambiguo o imposible de cumplir, pregunta al usuario en lugar de inventar.

## Decisiones ya tomadas con el usuario

- Nombre del juego: **Forja Abisal**. Licencia: **MIT**.
- Agacharse: **C** como tecla principal y **Ctrl** como alternativa (Ctrl+W cierra la pestaña). En pantalla completa con Chromium se usa la Keyboard Lock API.
- Niveles: además de los sectores, se admiten **losas** (plataformas sólidas dentro de un sector) para poder pasar por debajo de balcones y puentes.
- **Parar al final de cada fase** y esperar el OK del usuario antes de empezar la siguiente.
- Navmesh con recast-navigation-js. Post-procesado con la librería `postprocessing`. Triangulación con `earcut`.
- TypeScript se queda en 6.x porque typescript-eslint aún no admite TS 7. Node mínimo: 22.12 (lo exige Vitest 5), fijado en `engines` y `.nvmrc`.

## Reglas innegociables

- **Todo el contenido es original**: modelos, texturas, sonidos, nombres, niveles y diseños. Nada de assets, nombres ni mapas de Doom ni de otro juego (el repo será público).
- Texturas generadas en canvas al arrancar y sonidos sintetizados con Web Audio; no se añaden archivos de assets externos.
- No instalar nada fuera de las dependencias npm del proyecto sin pedir permiso.
- Nombres de archivo en **snake_case**. Tests junto al código como `*.test.ts`.
- No hacer push ni crear el remoto sin que el usuario lo pida; cuando lo pida, comprobar antes que `gh` está instalado y autenticado.

## Comandos

```bash
npm run dev          # servidor de desarrollo Vite
npm run build        # tsc --noEmit + vite build → dist/
npm run preview      # servir dist/
npm test             # Vitest (una pasada)
npx vitest run src/engine/core/math_utils.test.ts   # un único archivo
npx vitest run -t "nombre del test"                 # un único test por nombre
npm run lint         # ESLint
npm run format       # Prettier (la CI ejecuta format:check)
npm run typecheck
```

`vite.config.ts` lee `VITE_BASE` para el `base`: el workflow de Pages le pasa `/<nombre-del-repo>/`, y en local se usa `/`. Los tests de Vitest se configuran en ese mismo archivo (`src/**/*.test.ts`, entorno node).

## Arquitectura

**Carpetas.**

- `src/engine/`: render, física, audio, input y niveles. No depende de `src/game/`.
- `src/game/`: jugador, armas, enemigos, mundo y reglas.
- `src/hud/`: overlay HTML/CSS.
- `src/ui/`: React, solo para los menús.
- `src/levels/`: niveles en JSON, importados por Vite.

La lógica pura no importa Three.js ni el DOM, para poder testearla en Node. Ya existe `player_movement` y `fixed_step`; están previstos sector_geometry, level_parser, weapon_logic, ai_state_machine y pickup_rules.

**Qué hay (fase 1).**

- `game/game.ts` (`Game`) crea los sistemas y ejecuta `GameLoop`: `fixedUpdate` a 60 Hz (jugador → `world.step()`) y `render` en cada frame.
- La vista del ratón se aplica en el render, no a paso fijo, para que responda al instante. La posición de la cámara se interpola entre los dos últimos pasos.
- **Estados:** `ready` → `playing` ⇄ `paused`, ligados al pointer lock (Esc lo suelta). React (`ui/app.tsx`) solo pinta el overlay según el estado.
- **`InputSystem`:**
  - Solo registra input con el ratón capturado.
  - Las pulsaciones se guardan hasta que alguien las consume con `consumePressed`, así no se pierden en frames sin paso de simulación.
  - Suelta todas las teclas al perder el foco o el pointer lock.
- **`CharacterBody`** (engine/physics):
  - Cuerpo cinemático en los pies, con la cápsula desplazada hacia arriba. Al agacharse cambia la forma y el offset, y fija ya la pose del collider (Rapier solo la recalcula en `step`).
  - Para levantarse comprueba antes el hueco con `intersectionWithShape`.
  - La gravedad y el salto del jugador los aplica `player_movement`, no el mundo de Rapier.

**Previsto.**

- **Niveles:** una lista global de vértices y sectores que apuntan a ellos; la contigüidad sale de las aristas compartidas. El generador extruye paredes y escalones, triangula suelos y techos, crea colliders trimesh y fusiona lo estático por material. Puertas, ascensores y paredes secretas son mallas aparte con cuerpos cinemáticos. El automapa y el navmesh se generan a partir de los mismos datos.
- **Rendimiento:** la luz de cada sector se hornea en colores de vértice y hay un pool fijo de luces puntuales (siempre el mismo número, para no recompilar shaders). El arma se renderiza en una segunda pasada con la profundidad limpia.

## Verificación en el navegador

- El navegador de Playwright **no concede pointer lock** (`WrongDocumentError`).
- En desarrollo, `window.__forja` expone el `Game`:
  - `debugSetPlaying(true)` entra en modo juego sin capturar el ratón.
  - `debugState()` devuelve la posición y la velocidad.
  - Se accede a los campos internos con `__forja.player`, por ejemplo `player.body.teleport(...)` o `player.yaw`.
- Para simular teclas mantenidas, usa `page.keyboard.down/up` en `browser_run_code_unsafe`.
- WebGL funciona en ese navegador, así que las capturas son fiables.

## Flujo de trabajo por fases

- Las fases (0–9) están en la especificación.
- **Cierre de cada fase:**
  1. Ejecutar lint, format:check, typecheck y test.
  2. Arrancar el juego y comprobarlo en el navegador (Playwright), sin errores en consola.
  3. Actualizar `README.md` y `CHANGELOG.md`.
  4. Hacer el commit. Solo si el juego arranca y los tests pasan.
  5. Dar un resumen corto, el mensaje del commit y cómo probarlo.
- Commits en Conventional Commits en español (p. ej. `feat: fase 2 - generador de niveles por sectores`), con commits intermedios si hay cambios grandes e independientes.
- Los lanzadores `jugar.command` y `jugar.sh` deben guardar el bit de ejecución en git (`git update-index --chmod=+x`). Son envoltorios finos: comprueban Node (≥ 22.12, la misma versión en `engines`) y llaman a `scripts/launcher.mjs`, que tiene toda la lógica.
- **`launcher.mjs`:**
  - Reinstala solo si `package-lock.json` es más nuevo que `node_modules/.forja_install_stamp`.
  - Recompila solo si cambia el hash de las entradas del build (guardado en `dist/.forja_build_hash`).
  - Sirve `dist/` con `vite preview` desde el puerto 4173 en adelante.
  - Acepta `--no-open` (o `FORJA_NO_OPEN=1`) para probarlo sin abrir el navegador.
- Para probar el doble clic de verdad: `open jugar.command` (abre Terminal.app como Finder).
