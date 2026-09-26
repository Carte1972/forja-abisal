# Changelog

Todos los cambios relevantes del proyecto se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sin publicar]

### Fase 4 — Armas, disparos, proyectiles, impactos y partículas

#### Añadido

- Cinco armas originales modeladas con primitivas: martillo de pistón, pistola de servicio, escopeta de dispersión, remachadora y lanzacargas. Cada una tiene disparo principal y alternativo.
- Lógica pura de armas (`weapon_logic`), cubierta con tests: cadencia, cargadores y reserva, recarga automática y manual, ráfagas, dispersión determinista, clic en vacío con cambio automático de arma, cambio de arma con bajada y subida, y selección con 1-5 o la rueda.
- Impactos instantáneos con raycast de Rapier y golpe cuerpo a cuerpo con tres rayos en abanico.
- Proyectiles con física propia (cuerpos dinámicos con CCD):
  - Carga explosiva que estalla al impactar.
  - Carga rebotadora con espoleta que parpadea.
- Explosiones con daño en área según la distancia y la línea de visión, empuje (rocket jump), temblor de cámara y marca de quemadura.
- El arma se dibuja en una capa aparte (segunda pasada con la profundidad limpia), así que nunca atraviesa las paredes. Se ilumina según la luz del sector.
- Animaciones procedurales del arma: balanceo al mirar y al andar, retroceso, fogonazo, recarga (la escopeta abre la báscula), cambio de arma y golpes del martillo.
- Retroceso de cámara (desactivable) y fogonazos con las luces de destello.
- Partículas en dos draw calls (aditivas y normales): chispas, polvo, humo, brasas, explosiones y sangre de color no realista, lista para los enemigos.
- Marcas de bala y de quemadura con un límite máximo cada una. Las quemaduras solo se pegan si caben en la superficie.
- Punto de mira dinámico e indicador provisional de arma y munición. Tecla R para recargar.
- Grupos de colisión, bus de eventos tipado, ruido de disparo para alertar a los enemigos de la fase 5 y registro de objetivos dañables.
- Inventario inicial configurable desde el `player_start` del nivel.

#### Corregido

- Suelos y techos se triangulan con Delaunay restringida sobre una rejilla de 2 m (`delaunator` + `@kninnug/constrainautor`), en vez de earcut. Earcut generaba triángulos largos y finos que la GPU del Mac (ANGLE sobre Metal) dejaba sin dibujar, y se veía una cuña del color del fondo cruzando el suelo y el techo. Las paredes largas se dibujan en columnas de 2 m.
- La normal de los polígonos se calcula a partir de los triángulos, no del orden de los puntos. Con la nueva triangulación, las huellas de la escalera salían con la normal invertida y no se dibujaban.
- Puertas y ascensores: se retranquean solo las caras que dan a sectores vecinos y llevan un faldón oculto, así que ya no dejan ver rendijas al moverse.

### Fase 3 — Texturas, iluminación, niebla y post-procesado

#### Añadido

- 16 texturas procedurales originales generadas en canvas al arrancar, que se repiten sin costuras:
  - Superficies: ladrillo, losas, peldaño, chapa antideslizante, paneles de techo y rejilla.
  - Paredes tecnológicas con tiras luminosas y paneles de circuitos.
  - Puerta, marco y ascensor.
  - Terreno y fluidos: roca, tierra, lava y ácido.
- Filtrado `NearestFilter` (con mipmaps para la distancia) y normal maps derivados de la luminancia de cada textura.
- Emisivos con bloom (tiras de luz, pilotos, lava). La lava y el ácido fluyen y laten.
- Sistema de luces con un número fijo de luces para no recompilar shaders:
  - 6 luces puntuales asignadas a las lámparas más cercanas; una con sombra.
  - 3 luces para destellos (fogonazos y explosiones), listas para las armas.
  - Modos de parpadeo: `steady`, `flicker`, `pulse`, `strobe` y `broken`.
- Pantallas de lámpara emisivas en una sola malla instanciada, y farolas con poste en exteriores.
- Sol direccional con sombras en los niveles con cielo. Sin sombras se apaga y se compensa con luz ambiental.
- Cielo procedural con shader: degradado, resplandor de brasas en el horizonte, nubes en movimiento y estrellas.
- Niebla lineal por distancia.
- Post-procesado con la librería `postprocessing`: bloom, viñeta, tone mapping ACES, MSAA y filtro de pixelado opcional. Opciones de calidad por código: sombras, post-procesado y escala de resolución.
- Panel de estadísticas con F3: FPS, tiempo de frame, draw calls y triángulos.
- Bloque `environment` y cosas `lamp` en el formato de nivel, documentados en el README.
- 56 tests nuevos: RNG, ruido periódico, normal maps, catálogo de texturas (tamaño, determinismo, costuras), parpadeos, selección de lámparas y entorno.

#### Cambiado

- La geometría visible de puertas y ascensores se mete 2 cm hacia dentro para no parpadear contra las paredes estáticas. La textura de las puertas visibles se ajusta a la hoja.
- El nivel de pruebas tiene 11 lámparas y el cielo a 9 m.
- Se eliminan los materiales de color plano y la iluminación provisional.

### Fase 2 — Generador de niveles por sectores

#### Añadido

- Formato de nivel en JSON: vértices globales, sectores con suelo y techo (planos o en rampa), cielo, texturas de pared, luz, secretos y especiales (daño, puerta, ascensor), losas y cosas.
- Parser con validación completa:
  - Anillos simples, orientación normalizada y aristas compartidas por dos sectores como máximo.
  - Uniones en T y alturas coherentes.
  - Puertas y ascensores convexos.
  - Un único inicio de jugador.
  - Informa de todos los errores a la vez, con la ruta de cada uno.
- Generador de geometría puro (`sector_geometry`):
  - Extruye paredes sólidas, escalones y dinteles.
  - Parte las paredes cuando dos rampas se cruzan.
  - Triangula suelos y techos con huecos (earcut).
  - Genera losas y la luz del sector en los colores de vértice.
  - Agrupa por textura: un draw call por material.
- Colisiones:
  - Trimesh estático de Rapier con corrección de aristas internas.
  - Techo invisible en los sectores con cielo.
  - Puertas y ascensores como prismas móviles con cuerpo cinemático convexo.
- Cargador glTF opcional (`things` de tipo `model`), cargado bajo demanda en su propio chunk.
- Nivel de pruebas con escalera, sala superior, foso de lava con puente y ascensor, puerta, patio exterior, rampa, terraza y hueco secreto.
- Sección "Cómo crear niveles nuevos" en el README.
- 31 tests nuevos de polígonos, parser y extrusión/triangulación de sectores.

#### Cambiado

- La sala de prueba de la fase 1 se sustituye por el nivel generado.
- Al chocar con una pared, la velocidad se recorta solo contra la normal de la pared: en rampas y escaleras el jugador ya no pierde velocidad.

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
