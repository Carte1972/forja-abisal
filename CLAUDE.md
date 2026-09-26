# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Fuente de verdad

`especificacion_proyecto.md` es la especificación completa de **Forja Abisal** (FPS 3D retro en el navegador con Three.js). **Léela entera antes de empezar cualquier fase y consúltala en cada una. No la modifiques** (está en `.prettierignore` para que no se reformatee). Si algo es contradictorio, ambiguo o imposible de cumplir, pregunta al usuario en lugar de inventar.

## Decisiones ya tomadas con el usuario

- Nombre del juego: **Forja Abisal**. Licencia: **MIT**.
- Agacharse: **C** como tecla principal y **Ctrl** como alternativa (Ctrl+W cierra la pestaña). En pantalla completa con Chromium se usa la Keyboard Lock API.
- Niveles: además de los sectores, se admiten **losas** (plataformas sólidas dentro de un sector) para poder pasar por debajo de balcones y puentes.
- **Parar al final de cada fase** y esperar el OK del usuario antes de empezar la siguiente.
- Navmesh con recast-navigation-js. Post-procesado con la librería `postprocessing`. Triangulación de superficies visibles con Delaunay restringida (`delaunator` + `@kninnug/constrainautor`); `earcut` solo para las tapas pequeñas de puertas y ascensores.
- **Node.js en los lanzadores (fase 9):** si falta o es antiguo, el lanzador descarga una copia portátil de Node LTS en `.forja_node/` (con verificación SHA-256), sin administrador. Esto **contradice a propósito** el punto 2 de "Lanzador de doble clic" de la especificación ("No debe instalar Node automáticamente"): lo decidió el usuario después. Si la descarga falla, se hace lo que dice la especificación (mensaje con enlace y esperar una tecla).
- **Nada de "Doom" en el juego ni en el README:** es una marca registrada. El usuario propuso titularlo "DOOM: Forja Abisal" y se descartó por ese motivo; el README lo presenta como "homenaje a los shooters en primera persona de los años 90".
- TypeScript se queda en 6.x porque typescript-eslint aún no admite TS 7. Node mínimo: 22.12 (lo exige Vitest 5), fijado en `engines` y `.nvmrc`.

## Reglas innegociables

- **Todo el contenido es original**: modelos, texturas, sonidos, nombres, niveles y diseños. Nada de assets, nombres ni mapas de Doom ni de otro juego (el repo es público).
- Texturas generadas en canvas al arrancar y sonidos sintetizados con Web Audio; no se añaden archivos de assets externos.
- No instalar nada fuera de las dependencias npm del proyecto sin pedir permiso.
- Nombres de archivo en **snake_case**. Tests junto al código como `*.test.ts`.
- **Repositorio:** https://github.com/Carte1972/forja-abisal (público, remoto `origin`). El usuario ha pedido ir guardando en GitHub: hacer `git push` a `main` después de los commits de cada fase. No cambiar la visibilidad ni la configuración del repositorio sin pedirlo.
- **Demo:** https://carte1972.github.io/forja-abisal/. Pages está en modo "GitHub Actions" y cada push a `main` la redespliega. Tras hacer push, comprueba con `gh run list` que CI y Deploy terminan en verde.

## Estado del proyecto

- Las 10 fases (0–9) de la especificación están terminadas. **Versión 1.0.0** publicada: etiqueta `v1.0.0` y release en GitHub.
- **Vídeo de presentación:** terminado según `especificacion_video.md` (5 fases, rama `feature/video`) y fusionado con `main` el 26 de septiembre de 2026. El tráiler se ve desde el menú principal del juego («Ver tráiler»). Para trabajos nuevos del vídeo, usa una rama y no hagas push ni merge a `main` sin pedirlo.
- Los cambios posteriores se anotan en `CHANGELOG.md` bajo `[Sin publicar]`. Para una versión nueva: subir `version` en `package.json` y `package-lock.json` (`npm version X.Y.Z --no-git-tag-version`), pasar `[Sin publicar]` a `[X.Y.Z] - fecha` (con su enlace al final del archivo), etiqueta `vX.Y.Z` y `gh release create`, todo con el OK del usuario.

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
npm run levels       # regenera src/levels/level_0N.json desde scripts/levels/
npm run planos       # regenera los planos SVG de docs/planos/ (los de INSTRUCCIONES.md)
```

`vite.config.ts` lee `VITE_BASE` para el `base`: el workflow de Pages le pasa `/<nombre-del-repo>/`, y en local se usa `/`. Los tests de Vitest se configuran en ese mismo archivo (`src/**/*.test.ts`, entorno node).

## Arquitectura

**Carpetas.**

- `src/engine/`: render, física, audio, input y niveles. No depende de `src/game/`.
- `src/game/`: jugador, armas, enemigos, mundo y reglas.
- `src/hud/`: overlay HTML/CSS.
- `src/ui/`: React, solo para los menús.
- `src/levels/`: niveles en JSON, importados por Vite, sus tests de jugabilidad y el generador de planos.
- `scripts/`: lanzadores (`launcher.mjs` y compañía), fuentes de los niveles y generadores (`build_levels.ts`, `build_plans.ts`).
- `docs/`: capturas del juego (`docs/capturas/`) y planos de los niveles (`docs/planos/`), usados por el README y por `INSTRUCCIONES.md`.

La lógica pura no importa Three.js ni el DOM, para poder testearla en Node. Ya existen `player_movement`, `fixed_step`, `rng`, `event_bus`, `polygon_utils`, `level_parser`, `sector_geometry`, `surface_triangulation`, `noise`, `normal_map`, `texture_catalog`, `decal_textures`, `light_effects`, `weapon_logic` y `damage`; `ai_state_machine`, `perception`, `enemy_defs`, `player_health` y `navmesh` (con WASM); `mover_logic`, `pickup_rules` y `level_stats`; `synth`, `settings_store`, `automap_lines`, `level_checks` y `level_plan`.

**Qué hay (fase 1).**

- `game/game.ts` (`Game`) crea los sistemas y ejecuta `GameLoop`: `fixedUpdate` a 60 Hz (el orden de los sistemas está en "Mundo (fase 6)") y `render` en cada frame.
- La vista del ratón se aplica en el render, no a paso fijo, para que responda al instante. La posición de la cámara se interpola entre los dos últimos pasos.
- **Estados:** `ready` → `playing` ⇄ `paused`, ligados al pointer lock (Esc lo suelta); la fase 8 añadió `dead` y `complete`. React (`ui/app.tsx`) solo pinta la interfaz según el estado.
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
  - Son prismas aparte con un cuerpo cinemático convexo. Se mueven con `Mover.setProgress(0..1)`; su lógica está en `world_system.ts` y `mover_logic.ts` (fase 6).
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
- **Daño:** los objetivos implementan `Damageable` y se registran por handle de collider en `DamageRegistry`. Los enemigos se registran ahí.
- **Capa del arma:** `Renderer.viewmodelScene` y `viewmodelCamera`, con un segundo `RenderPass` que solo borra la profundidad. Los modelos están en `viewmodels.ts` y la animación en `viewmodel_animator.ts`.
- **Efectos:** partículas en `engine/render/particle_system.ts` y marcas en `decal_system.ts`. Solo se marca la geometría estática: se compara `hit.collider.handle` con `level.staticColliderHandle`.

**Trampas de render ya encontradas.**

- **Triángulos largos y finos:** la GPU del Mac (ANGLE sobre Metal) no los dibuja cuando cruzan el plano de la cámara. Por eso los suelos, techos y losas usan `surface_triangulation.ts` (Delaunay restringida sobre una rejilla de 2 m, con aristas partidas de forma canónica para que los sectores vecinos casen) y las paredes largas se parten en columnas (`MAX_RENDER_EDGE`). **No vuelvas a usar earcut para superficies visibles.** Solo lo usan las tapas pequeñas de puertas y ascensores.
- **Normales:** `MeshWriter.addPolygon` calcula la normal a partir de los triángulos (`planeNormal`), porque los puntos pueden llegar en cualquier orden.
- **Cómo detectar huecos:** pon en la escena `overrideMaterial` blanco, quita la niebla y el cielo, pon el fondo magenta y cuenta los píxeles magenta con `gl.readPixels` justo después de `renderer.render()`. Hay que renderizar a mano: tras un frame normal el búfer ya está limpio y la cuenta sale 0.

**Enemigos (fase 5).**

- **Lógica pura (con tests):** `game/enemies/ai_state_machine.ts` (`stepAi`: recibe `AiPerception` y devuelve un `AiCommand` con `move`, `face`, `strike` y `entered`), `perception.ts` (cono de visión y giros) y `enemy_defs.ts` (datos de los 4 tipos).
- **`EnemySystem`** (`enemy_system.ts`) lo une todo:
  - Percepción: la vista se comprueba cada 0,15–0,25 s con un raycast contra `STATIC | MOVER`. El ruido llega por el `EventBus` y se oye si la longitud del camino por el navmesh cabe en el radio.
  - Movimiento: con `Navigation.findPath` (repathing cada 0,5 s), o directo si el objetivo está cerca y a la vista, o si vuela.
  - Ataques y muerte. La animación va en `render()`, interpolada entre pasos.
- **Objetivos:** el jugador (`PlayerCombatant`) y los enemigos implementan `Combatant`, así que un enemigo puede apuntar a otro. El jugador se registra con `DamageRegistry.registerPlayer`: `lookup` lo encuentra, pero `within` (explosiones) no lo incluye, porque su empuje se aplica aparte.
- **Navmesh:** `engine/ai/navmesh.ts`, con recast-navigation (WASM embebido, así que se inicializa con `initNavigation()`, también en los tests de Node) sobre `LoadedLevel.collision`. Las puertas no forman parte de la malla estática, así que el camino las atraviesa: al chocar con una puerta normal cerrada, el enemigo la abre (`openDoorAt` → `WorldSystem.openDoorForEnemy`). Las secretas y las de llave no las abren.
- **Modelos:** `enemy_models.ts` construye el rig por articulaciones y luego fusiona las piezas de cada articulación por material (`mergeJoints`). Para animar, se rota la articulación, nunca las piezas.

**Mundo (fase 6).**

- **`game/world/world_system.ts`:** puertas y ascensores (con `mover_logic.ts`, puro), uso con E, llaves, secretos, suelos dañinos, objetos (`pickup_rules.ts`, puro) y salida.
- **Orden en `Game.fixedUpdate`:**
  1. `world.fixedUpdate`: mueve las plataformas con `Mover.setProgress` y `propagateModifiedBodyPositionsToColliders`, y teletransporta al jugador el mismo desplazamiento si está encima de un ascensor.
  2. Jugador.
  3. Armas.
  4. Enemigos.
  5. `physics.step`.

  No cambies este orden: el controlador de personaje debe ver ya la plataforma en su sitio.

- **Estadísticas:** el mundo solo emite eventos (`pickup`, `secretFound`, `levelComplete`, `message`) y `Game` cuenta en `LevelStats`.
- **Inventario:** llega a las reglas de objetos a través de la interfaz `Inventory` (salud y blindaje de `PlayerCombatant`, armas y munición de `weapon_logic`, llaves en `Game.keys`).
- **HUD:** `src/hud/hud.ts` (DOM con escrituras solo cuando cambia algo) y `player_face.ts` (canvas, solo se redibuja al cambiar de estado).
- **Fin de nivel:** `Game` pasa a `status: 'complete'` y llama a `callbacks.onLevelComplete(summary, carry)`. React (`ui/level_end.tsx`) muestra la pantalla con "Siguiente: <nombre>", "Repetir nivel" (o "Volver a empezar" tras el último) y "Menú principal". Todas pasan por `startLevel` de `App`, que cambia `run` (con un contador `attempt`) para que el efecto recree `Game`.

**Niveles de la campaña (fase 7).**

- **Fuentes:** `scripts/levels/level_0N.ts` (con `LevelKit` de `level_kit.ts`). `npm run levels` genera `src/levels/level_0N.json`, y **nunca se editan los JSON a mano**.
- **Node y TypeScript:** el script lo ejecuta Node directamente quitando los tipos, así que en `scripts/` solo vale TypeScript "borrable" (sin propiedades en el constructor ni enums) y los imports llevan la extensión `.ts`.
- **Registro:** `src/levels/index.ts` (`LEVELS`), y `ui/campaign.ts` decide qué nivel cargar (también `?nivel=N` o `?nivel=prueba`). `App` guarda el `PlayerCarry` que devuelve `onLevelComplete` y se lo pasa a `Game.create` en el siguiente nivel.
- **Verificación:** `src/levels/level_checks.ts` recorre el grafo de sectores (y de losas, con índices negativos) respetando `MAX_RISE` y `MIN_HEADROOM`. `campaign.test.ts` exige, para cada nivel de `LEVELS`, las tres llaves en orden, la salida bloqueada sin llaves, 2 o más secretos alcanzables y todos los objetos y enemigos alcanzables.
- **Para revisar un nivel a ojo:** abre el automapa (Tab) o regenera su plano completo con `npm run planos` y ábrelo desde `docs/planos/`.

**Audio, menús y automapa (fase 8).**

- **Sonido:** `engine/audio/synth.ts` es puro (recetas → `Float32Array`, con tests) y `audio_system.ts` convierte las muestras en `AudioBuffer`s y reparte voces. La lógica del juego nunca llama al audio: emite el evento `sound` del bus (`{ id, position?, volume?, pitch? }`) y `Game` lo reenvía. Un sonido nuevo: añade el id a `SoundId` y su receta en `RECIPES`.
- **El `AudioContext` es único y lo comparte Three.js:** `AudioSystem.dispose()` no lo cierra (al reiniciar el nivel se reutiliza). Empieza suspendido; `requestPlay()` lo reanuda.
- **Estados de `Game`:** `ready` → `playing` ⇄ `paused`, más `dead` (tras `DEATH_DELAY`) y `complete`. El listener del pointer lock ignora `dead` y `complete`.
- **Interfaz (`ui/app.tsx`):** sin `?nivel` empieza en `MainMenu`. Cada `startLevel` cambia `run` y el efecto recrea `Game`. Los paneles (`OptionsMenu`, `ControlsPanel`) se pintan encima de cualquier estado salvo `playing`.
- **Ajustes:** `ui/settings_store.ts` (puro, con tests) valida y persiste en `localStorage` (`forja-abisal:ajustes`). `App` los aplica con `Game.applySettings`, que reparte FOV, sensibilidad, volumen, calidad y visibilidad del panel F3. Para añadir una opción: `Settings`, `sanitizeSettings`, `GameSettings`, `applySettings` y `OptionsMenu`.
- **Automapa:** `hud/automap_lines.ts` (puro) saca las líneas de `LevelData`, y `hud/automap.ts` las dibuja en un canvas a 30 fps revelando el sector del jugador y sus vecinos (menos las puertas ocultas).
- **Rendimiento:** con la pantalla del Mac (2400×1896, DPR 2) el cuello de botella es el relleno de píxeles de la GPU, no la CPU ni las draw calls. Por eso `defaultSettings` pone la resolución al 75 % con DPR ≥ 2 (≈115 FPS en los tres niveles).

**Documentación para jugadores (después de la 1.0.0).**

- **`README.md`:** incluye una galería de capturas, la sección "Recursos empleados" (modelo, esfuerzo, tiempo activo y tokens del desarrollo; datos fijos, no se recalculan solos) y el enlace a la guía.
- **`INSTRUCCIONES.md`:** guía del jugador con cifras reales del código (daño de enemigos y armas, objetos, lava y ácido) y la descripción, el plano y la ruta de cada nivel, con los planos y rutas dentro de `<details>` como spoiler. **Si cambias armas, enemigos, objetos o niveles, actualízala.** Los planos no se ponen en el README, para no destripar llaves y secretos.
- **Planos (`npm run planos`):** `src/levels/level_plan.ts` (puro, con tests) dibuja el SVG a partir de `LevelData` y de `buildAutomapLines`. `scripts/build_plans.ts` guarda los nombres de las salas y la posición de las etiquetas que se solaparían, y carga el código de `src/` con `runnerImport` de Vite, porque `src/` usa imports sin extensión que Node no resuelve. Si un nivel cambia, regenera los planos y revisa que las etiquetas no se monten.
- **Capturas (`docs/capturas/`):** se sacan a mano con Playwright (ver la sección siguiente) y se convierten a JPEG con `sips -s format jpeg -s formatOptions 85` (herramienta de macOS).

**Vídeo de presentación (`video/`).**

- **Fuente de verdad:** `especificacion_video.md` (no se modifica). La documentación de uso está en `video/README.md`. El usuario **no grabará su voz**: se queda la voz Reed de macOS. La música es sintetizada y no hay efectos de sonido del juego en los clips.
- **Tráiler dentro del juego:** el menú principal tiene «Ver tráiler» (`src/ui/trailer_player.tsx`), que reproduce `public/trailer/forja_abisal_trailer.mp4` (versión web, ~29 MB, generada con `npm run video:web`). Es la única copia del vídeo que se versiona: la especificación dice que el MP4 no se suba, pero el usuario decidió después tener el botón, y sin el archivo en el repositorio no funcionaría en GitHub Pages. Mantenla por debajo de 50 MB, que es donde GitHub empieza a avisar.
- **`video/` es un paquete npm aparte** (Remotion, `playwright-core`, `@fontsource`…), para que `npm install` y los lanzadores del juego no descarguen Remotion. Usa ESLint, Prettier y Vite de la raíz. Sus scripts se lanzan desde la raíz con `npm run video:*`.
- **Modo de grabación (`src/recording/`):**
  - `main.tsx` solo lo carga con `import.meta.env.DEV || MODE === 'grabacion'`. Comprueba con un grep en `dist/` que no se cuela en el build.
  - `Game` expone `recordingStep`, `recordingAccess` y `cameraOverride`, y con `setup.recording` no arranca su bucle, no suena y hace al jugador invulnerable.
  - El script `video/scripts/grab_clips.ts` llama a `window.__grabacion.step()` y captura con `Page.captureScreenshot` de DevTools (el HUD es DOM, no está en el canvas).
- **Ajustar clips:**
  - `npm run video:clips -- --vista <clip>` saca tres fotogramas.
  - Para medir, carga `?grabar=<clip>` en un iframe desde Playwright y llama a `__grabacion.step()` y `debug()` fotograma a fotograma: posición del jugador, estado y salud de los enemigos.
- **Trampas encontradas al grabar:**
  - El yaw crece hacia el oeste, así que girar a la izquierda es sumar. Me equivoqué de signo una vez.
  - El rastrero es bajo: para acertarle hay que mirar hacia abajo, o usar `aim`.
  - Un enemigo solo ataca a la cámara si mira hacia ella (`yaw`) y hay `playerFollows`.
  - El hueco del ascensor de la torre (Núcleo Abisal) frena los saltos con carga a su lado.
  - Tras crear un clip nuevo hay que recargar la página, porque `import.meta.glob` se evalúa al cargar.
- **Remotion (`video/src/`):**
  - `timing.ts` calcula las escenas desde la duración real de `public/narracion/*.wav`; sin audio, usa la estimación del guion.
  - Comprueba qué archivos existen con `getStaticFiles()`, no con `fetch`, para no provocar errores 404.
  - Los cortes van en `narrationAt(timing, fracción)`. Si cambia el texto, mide las pausas del WAV (silencios de más de 0,18 s) y ajusta las fracciones.
  - Las fuentes se cargan con `@remotion/fonts` desde `@fontsource`, sin Google Fonts en red.
  - El navegador sale de `scripts/find_browser.ts`, así que nunca se descarga uno.
  - `OffthreadVideo` usa `trimBefore`, no `startFrom`, que está obsoleto.
- **El ffmpeg de Remotion es mínimo:** no tiene `drawtext` ni `xstack`. Para hojas de contacto, monta una página HTML y captúrala con Playwright.
- **zsh no parte las variables en palabras** como bash: `set -- $var` no separa. Usa `bash -c` si hace falta.

## Verificación en el navegador

- El navegador de Playwright **no concede pointer lock** (`WrongDocumentError`).
- En desarrollo, `window.__forja` expone el `Game`, incluido `level.movers` (por ejemplo, `.find(m => m.kind === 'door').setProgress(1)` abre la puerta):
  - `debugSetPlaying(true)` entra en modo juego sin capturar el ratón.
  - `debugState()` devuelve la posición y la velocidad.
  - Se accede a los campos internos con `__forja.player`, por ejemplo `player.body.teleport(...)` o `player.yaw`.
- Para simular teclas mantenidas, usa `page.keyboard.down/up` en `browser_run_code_unsafe`.
- Para disparar sin mover el ratón (lo que giraría la vista), usa `__forja.input.press('fire', 'test', false)` y luego `release('fire', 'test')`. Tras cambiar `player.yaw`, espera al menos un frame antes de disparar: la puntería usa la cámara del último render.
- **Ojo con `.overlay`:** la pantalla de fin de nivel también usa esa clase. Para ocultar solo la de inicio, usa `.overlay:not(.level-end)`.
- **Entrar a un nivel sin pasar por el menú:** usa `?nivel=1`. Para forzar el fin de nivel, `__forja.bus.emit('levelComplete', {})`.
- **Galerías sin que se muevan:** si no se entra en modo juego, los enemigos no se mueven. Para fotografiarlos, oculta el overlay con `page.addStyleTag({ content: '.overlay{display:none!important}' })`.
- **Leer el búfer HDR:** `renderer.composer.inputBuffer` con `readRenderTargetPixels` (HalfFloat, se decodifica con `THREE.DataUtils.fromHalfFloat`). `gl.readPixels` sobre el canvas no sirve con el composer activo.
- **Cuidado:** no lances en paralelo una edición de código y una recarga de la página. La recarga puede llegar antes del cambio (pasó en la fase 3 y el resultado confundió).
- WebGL funciona en ese navegador, así que las capturas son fiables.
- **Capturas para la documentación:** ventana de 1280×720, ajustes guardados en `localStorage` (`forja-abisal:ajustes`) con `resolutionScale: 1` y `volume: 0`, y `?nivel=N`. Para encuadrar: `player.body.teleport({x, y: alturaDelSuelo, z})`, `player.yaw = Math.atan2(-(tx - x), -(tz - z))` para mirar a `(tx, tz)`, `player.pitch`, y luego `debugSetPlaying(true)` unos 250 ms y `false`, para que la cámara se actualice sin que los enemigos se muevan. Oculta `.overlay` con CSS. Ojo al colocarte: un punto junto a una pasarela puede caer en la lava.
- Playwright solo guarda archivos (`filename`) dentro del proyecto: para volcar datos grandes desde `browser_evaluate`, usa `.playwright-mcp/` (está en `.gitignore`) y bórralos después. Abrir un `.svg` directamente con `browser_navigate` se queda colgado; mételo en un HTML con `<img>`.

## Flujo de trabajo por fases

- Las fases (0–9) están en la especificación.
- **Cierre de cada fase:**
  1. Ejecutar lint, format:check, typecheck y test.
  2. Arrancar el juego y comprobarlo en el navegador (Playwright), sin errores en consola.
  3. Actualizar `README.md` y `CHANGELOG.md`.
  4. Hacer el commit. Solo si el juego arranca y los tests pasan.
  5. Dar un resumen corto, el mensaje del commit y cómo probarlo.
- Commits en Conventional Commits en español (p. ej. `feat: fase 2 - generador de niveles por sectores`), con commits intermedios si hay cambios grandes e independientes.
- **Lanzadores:** `jugar.command` (macOS), `jugar.sh` (Linux) y `jugar.bat` (Windows). `jugar.command` y `jugar.sh` deben guardar el bit de ejecución en git (`git update-index --chmod=+x`). `.gitattributes` fuerza CRLF en `.bat` y `.ps1` (cmd.exe falla con los `goto` si el `.bat` tiene LF) y LF en el resto.
- **Preparar Node:** `scripts/node_portable.sh` (cargado con `source` por los dos lanzadores de shell) y `scripts/node_portable.ps1` (llamado por `jugar.bat`). Usan el Node del sistema si `scripts/check_node.cjs` lo acepta (lee `engines.node` de `package.json`, que es la única fuente de la versión mínima), si no la copia de `.forja_node/`, y si no la descargan de `nodejs.org/dist/latest-v22.x`. `FORJA_FORCE_PORTABLE=1` ignora el Node del sistema para probar la descarga.
- El `.ps1` va en UTF-8 **con BOM**: Windows PowerShell 5.1 lee los scripts sin BOM como ANSI y rompería las tildes. `check_node.cjs` usa sintaxis antigua a propósito, porque se ejecuta con Nodes viejos.
- **`launcher.mjs`:**
  - Reinstala solo si `package-lock.json` es más nuevo que `node_modules/.forja_install_stamp`.
  - Recompila solo si cambia el hash de las entradas del build (guardado en `dist/.forja_build_hash`).
  - Sirve `dist/` con `vite preview` desde el puerto 4173 en adelante.
  - Acepta `--no-open` (o `FORJA_NO_OPEN=1`) para probarlo sin abrir el navegador.
- Para probar el doble clic de verdad: `open jugar.command` (abre Terminal.app como Finder).
