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
- **Repositorio:** https://github.com/Carte1972/forja-abisal (público, remoto `origin`). El usuario ha pedido ir guardando en GitHub: hacer `git push` a `main` después de los commits de cada fase. No cambiar la visibilidad ni la configuración del repositorio sin pedirlo.
- **Demo:** https://carte1972.github.io/forja-abisal/. Pages está en modo "GitHub Actions" y cada push a `main` la redespliega. Tras hacer push, comprueba con `gh run list` que CI y Deploy terminan en verde.

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

La lógica pura no importa Three.js ni el DOM, para poder testearla en Node. Ya existen `player_movement`, `fixed_step`, `rng`, `event_bus`, `polygon_utils`, `level_parser`, `sector_geometry`, `surface_triangulation`, `noise`, `normal_map`, `texture_catalog`, `decal_textures`, `light_effects`, `weapon_logic` y `damage`; están previstos ai_state_machine y pickup_rules.

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

**Niveles (fase 2).**

- **Flujo:** `src/levels/*.json` → `engine/level/level_parser.ts` (`parseLevel`, validación y normalización) → `sector_geometry.ts` (`buildLevelGeometry`, puro) → `level_builder.ts` (`buildLevel`: mallas Three.js, colliders Rapier y `Mover`s).
- **Formato:** está documentado campo a campo en el README ("Cómo crear niveles nuevos"). Es la referencia al crear niveles.
- **Orientación:** el parser deja los anillos exteriores en sentido antihorario y los huecos en horario (área con signo en XZ). Así, el interior de un sector siempre queda a la izquierda de cada arista (`interiorNormal`). El generador no fía el sentido de los triángulos: los reorienta según la normal esperada (`MeshWriter.addPolygon`).
- **Contigüidad:** sale de las aristas que comparten índices de vértice. Por eso el parser rechaza las uniones en T.
- **Paredes entre sectores (`addDifferenceWall`):**
  - La pared de suelos mira al lado bajo y usa `walls.lower` del sector de detrás.
  - La de techos mira al lado alto y usa `walls.upper` del sector de detrás.
  - Entre dos sectores con cielo no hay dintel.
- **Puertas y ascensores:**
  - Son prismas aparte con un cuerpo cinemático convexo. Se mueven con `Mover.setProgress(0..1)`, sin lógica todavía (llega en la fase 6).
  - La geometría estática trata la puerta como abierta (no genera su techo) y el ascensor como bajado (suelo en `lowHeight`, sin su tapa). El prisma tapa el resto.
- **Jugador contra paredes:** solo se recorta la velocidad contra las normales de las paredes (`MoveResult.wallNormals`) cuando el avance ha quedado bloqueado. Si se recortara con el movimiento real, se frenaría en rampas y escaleras.
- **Nivel de pruebas:** `src/levels/test_level.json` se generó con un script auxiliar y ahora se edita a mano. Test de humo en `src/levels/levels.test.ts`.

**Render (fase 3).**

- **Texturas:** `engine/textures/texture_catalog.ts` tiene los generadores puros (sobre `PixelBuffer`) y se testea en Node. `texture_library.ts` (`ProceduralMaterials`, que implementa `MaterialLibrary`) los vuelca a canvas, deriva los normal maps y crea los `MeshStandardMaterial` con `vertexColors` para la luz del sector.
  - Todo ruido debe ser periódico (`fbm`, `fbmAniso`, `voronoi` de `noise.ts`). No escales las coordenadas de entrada: rompe la periodicidad. Hay un test que detecta costuras.
  - **Nueva textura:** añade su generador y su entrada en `TEXTURE_CATALOG`, y su nombre en la lista del README.
- **Luces:** `engine/render/light_system.ts` usa un número **fijo** de luces (6 de lámpara, 1 con sombra, y 3 de destello con `flash()` para fogonazos y explosiones).
  - Nunca cambies `castShadow` ni el número de luces en ejecución: recompila todos los shaders.
  - La selección de lámparas (`selectLamps`) y los parpadeos (`flickerFactor`) son puros, en `light_effects.ts`.
- **Sol:** solo en niveles con cielo. Depende de las sombras para no iluminar interiores: si se desactivan, se apaga y se sube la luz ambiental (`LightSystem.setShadowsEnabled`).
- **Calidad:** usa `Game.setQuality()`, que cambia el renderer y las luces a la vez.
- **Post-procesado:** `engine/render/renderer.ts`, con EffectComposer en HalfFloat, bloom, viñeta, tone mapping y pixelado en un pase aparte. Con post-procesado, `renderer.toneMapping` es `NoToneMapping`.
  - El bloom se activa con luminancia > ~1. Los emisivos usan `emissiveIntensity` > 1 y las pantallas de lámpara llevan color HDR en `instanceColor`.
- **Cielo:** `sky_dome.ts`, una esfera que sigue a la cámara, en el plano lejano y sin escribir profundidad.
- **Puertas y ascensores:** la geometría visible va `MOVER_INSET` hacia dentro para evitar z-fighting con paredes coplanares. El collider no.

**Armas (fase 4).**

- **Lógica pura:** `game/weapons/weapon_defs.ts` (datos) y `weapon_logic.ts` (`updateWeapons` devuelve eventos `fire`, `reloadStart`, `lower`…; tiene tests).
- **`WeaponSystem`:** convierte esos eventos en raycasts (`PhysicsWorld.castRay` con grupos de `collision_groups.ts`), proyectiles (`projectiles.ts`, cuerpos dinámicos con CCD y eventos de colisión que llegan por `PhysicsWorld.step(onCollision)`), explosiones, fogonazos y ruido (`EventBus<GameEvents>`).
- **Daño:** los objetivos implementan `Damageable` y se registran por handle de collider en `DamageRegistry`. Los enemigos de la fase 5 deben registrarse ahí.
- **Capa del arma:** `Renderer.viewmodelScene` y `viewmodelCamera`, con un segundo `RenderPass` que solo borra la profundidad. Los modelos están en `viewmodels.ts` y la animación en `viewmodel_animator.ts`.
- **Efectos:** partículas en `engine/render/particle_system.ts` y marcas en `decal_system.ts`. Solo se marca la geometría estática: se compara `hit.collider.handle` con `level.staticColliderHandle`.

**Trampas de render ya encontradas.**

- **Triángulos largos y finos:** la GPU del Mac (ANGLE sobre Metal) no los dibuja cuando cruzan el plano de la cámara. Por eso los suelos, techos y losas usan `surface_triangulation.ts` (Delaunay restringida sobre una rejilla de 2 m, con aristas partidas de forma canónica para que los sectores vecinos casen) y las paredes largas se parten en columnas (`MAX_RENDER_EDGE`). **No vuelvas a usar earcut para superficies visibles.** Solo lo usan las tapas pequeñas de puertas y ascensores.
- **Normales:** `MeshWriter.addPolygon` calcula la normal a partir de los triángulos (`planeNormal`), porque los puntos pueden llegar en cualquier orden.
- **Cómo detectar huecos:** pon en la escena `overrideMaterial` blanco, quita la niebla y el cielo, pon el fondo magenta y cuenta los píxeles magenta con `gl.readPixels` justo después de `renderer.render()`. Hay que renderizar a mano: tras un frame normal el búfer ya está limpio y la cuenta sale 0.

**Previsto.**

- **Navmesh (recast) y automapa:** se generarán a partir de `LevelData` y de la malla de colisión.

## Verificación en el navegador

- El navegador de Playwright **no concede pointer lock** (`WrongDocumentError`).
- En desarrollo, `window.__forja` expone el `Game`, incluido `level.movers` (por ejemplo, `.find(m => m.kind === 'door').setProgress(1)` abre la puerta):
  - `debugSetPlaying(true)` entra en modo juego sin capturar el ratón.
  - `debugState()` devuelve la posición y la velocidad.
  - Se accede a los campos internos con `__forja.player`, por ejemplo `player.body.teleport(...)` o `player.yaw`.
- Para simular teclas mantenidas, usa `page.keyboard.down/up` en `browser_run_code_unsafe`.
- Para disparar sin mover el ratón (lo que giraría la vista), usa `__forja.input.press('fire', 'test', false)` y luego `release('fire', 'test')`. Tras cambiar `player.yaw`, espera al menos un frame antes de disparar: la puntería usa la cámara del último render.
- **Cuidado:** no lances en paralelo una edición de código y una recarga de la página. La recarga puede llegar antes del cambio (pasó en la fase 3 y el resultado confundió).
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
