# Changelog

Todos los cambios relevantes del proyecto se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sin publicar]

### Añadido

- `INSTRUCCIONES.md`: guía del jugador con cómo empezar, el objetivo, salud y daño, qué pasa al morir, objetos, armas, secretos, enemigos, cómo leer el automapa y la descripción de cada nivel, con su plano completo y la ruta (ocultos como spoiler).
- Capturas del juego en el README (`docs/capturas/`) y planos de los tres niveles en SVG (`docs/planos/`), generados a partir de los datos de cada nivel.

### Cambiado

- README: la introducción presenta el juego como homenaje a los shooters en primera persona de los años 90.

## [1.0.0] - 2026-09-26

Primera versión completa: tres niveles jugables de principio a fin, cinco armas, cuatro tipos de enemigos, sonido, menús, opciones y automapa. Se juega en el navegador (demo en GitHub Pages) o en local con los lanzadores de macOS, Windows y Linux. Las secciones siguientes recogen los cambios de cada fase del desarrollo.

### Fase 9 — Cierre: lanzadores, documentación y verificación final

#### Añadido

- Lanzadores de doble clic para Windows (`jugar.bat`) y Linux (`jugar.sh`), con la misma lógica que el de macOS (`scripts/launcher.mjs`). El de Linux abre una terminal si se lanza con doble clic sin ella.
- Si el equipo no tiene Node.js 22.12 o superior, los lanzadores descargan una copia portátil de Node.js LTS desde nodejs.org en `.forja_node/`, comprueban su suma SHA-256 y la usan solo para el juego, sin permisos de administrador. Si no se puede descargar, muestran el enlace de descarga y esperan una tecla.
- `scripts/check_node.cjs`: única comprobación de la versión mínima de Node.js, leída de `engines` en `package.json`.
- README completo: qué hay que hacer y puntuación, funcionalidad, controles, instalación en los tres sistemas con solución de problemas, arquitectura (diagrama Mermaid de sistemas, game loop, carga de niveles, generador de geometría y árbol de carpetas), creación de niveles, desarrollo, cómo contribuir y créditos.
- `.gitattributes` con los finales de línea de cada tipo de lanzador.

#### Cambiado

- `jugar.command` delega en `scripts/node_portable.sh`, compartido con `jugar.sh`.

### Fase 8 — Audio, menús, opciones y automapa

#### Añadido

- Audio con Web Audio y `THREE.PositionalAudio`. Los 34 efectos (armas, impactos, explosiones, voces de los enemigos, puertas, ascensores, objetos, secretos, salida y ambiente) se sintetizan por código al arrancar, de forma determinista y con tests (sin saturación y sin chasquidos al empezar ni al acabar).
  - 24 voces posicionales y 8 sin posición, reutilizadas; si se agotan, se corta la más antigua.
  - Cada tipo de enemigo tiene su tono de voz.
  - Zumbido ambiental en bucle sin saltos.
- Menú principal con nueva partida, elección de nivel, opciones y controles.
- Menú de pausa: continuar, opciones, controles, reiniciar el nivel y salir al menú.
- Pantalla de muerte: tras una breve caída de la cámara, permite reintentar el nivel con lo que se tenía al entrar o volver al menú.
- Opciones persistentes en `localStorage`, validadas y aplicadas en caliente: sensibilidad del ratón, invertir eje vertical, campo de visión, balanceo, retroceso, volumen, sombras, post-procesado, filtro de píxeles, resolución y panel de rendimiento.
- Automapa (Tab) que se va descubriendo al explorar: paredes, escalones, zonas peligrosas, puertas coloreadas según su llave, ascensores, llaves pendientes y salida. No delata las paredes secretas ni los objetos de zonas sin descubrir.
- Botón "Menú principal" en la pantalla de fin de nivel.

#### Cambiado

- Al morir ya no se reaparece en el sitio: se pasa al estado `dead` y se muestra la pantalla de muerte.
- En pantallas de alta densidad la resolución empieza al 75 % por defecto (el límite era el relleno de píxeles de la GPU).
- Sin `?nivel=N` en la dirección, el juego empieza en el menú principal.

### Fase 7 — Los tres niveles

#### Añadido

- Tres niveles originales de dificultad creciente, cada uno con puertas y llaves roja, azul y amarilla y dos secretos:
  - **Fundición Cero:** canal de lava con puente, sótano con ascensor, galería elevada, patio exterior con plataforma. 13 enemigos.
  - **Pozos de Ceniza:** sima a cielo abierto con tres alturas, rampa, pozo de ácido con ascensor, puente-losa sobre el vacío, crematorio con entreplanta y galerías elevadas. 21 enemigos.
  - **Núcleo Abisal:** caverna con lago de lava, pasarelas-losa, isla con torre y ascensor, armería, sala fría con canal de ácido y emboscada final. 34 enemigos.
- Kit de autoría de niveles (`scripts/levels/level_kit.ts`): salas, escaleras, losas y cosas con coordenadas. Deduplica vértices y parte uniones en T automáticamente. El script `npm run levels` genera los JSON y lo ejecuta Node directamente, sin compilar.
- Verificador de jugabilidad (`src/levels/level_checks.ts`) sobre el grafo de sectores y losas: alturas de paso y salto, hueco bajo el techo, los dos niveles de los ascensores y puertas con llave. Con tests que exigen, para cada nivel:
  - Que se consigan las tres llaves y que la salida sea alcanzable con ellas pero no sin ellas.
  - Que haya al menos dos secretos, todos alcanzables.
  - Que todos los objetos y enemigos estén en zonas alcanzables.
- Campaña: los niveles se encadenan, y armas, munición, salud y blindaje pasan al siguiente. La pantalla de fin de nivel ofrece seguir o repetir, y al terminar el último, volver a empezar.
- Parámetro `?nivel=N` para empezar en un nivel concreto y `?nivel=prueba` para el nivel de pruebas.

#### Cambiado

- `Game.create` recibe el nivel que hay que cargar y, opcionalmente, el estado del jugador al terminar el anterior.

### Fase 6 — Puertas, ascensores, llaves, secretos, objetos, HUD y salida

#### Añadido

- Puertas y ascensores con ciclo completo (activar, recorrer, esperar y volver) en lógica pura con tests. Las puertas se reabren si hay alguien debajo.
- Tecla E para usar:
  - Puertas y ascensores a los que se apunta, o el ascensor sobre el que se está.
  - Interruptores de salida.
- Los ascensores llevan al jugador al subir y al bajar: la plataforma se mueve antes que el jugador y su collider se actualiza al instante.
- Llaves roja, azul y amarilla. Las puertas con llave muestran un aviso si falta.
- Paredes secretas (puertas ocultas con la textura de la pared) y zonas secretas que se cuentan al entrar.
- Suelos que hacen daño (lava, ácido) a intervalos.
- Los enemigos abren las puertas normales al perseguirte (no las secretas ni las de llave).
- 14 objetos originales que flotan y giran: salud, blindaje, munición, armas y llaves. Reglas de recogida con tests: no se recogen si no sirven, y un arma nueva se saca al momento.
- HUD completo en HTML/CSS:
  - Barra con munición, salud, icono del jugador, blindaje, armas y llaves.
  - Indicador de dirección del daño.
  - Destellos rojo y de color al recoger objetos.
  - Mensajes.
- Icono del jugador original: casco de forja con visor que cambia de color con la salud, se agrieta, mira hacia el daño, sonríe al curarse y se apaga al morir.
- Interruptor de salida y pantalla de fin de nivel (React) con tiempo y % de enemigos, objetos y secretos, y botón para jugar de nuevo.
- Formato de nivel: cosas `pickup` y `exit`, y la opción `y` para colocar objetos sobre losas.
- Nivel de pruebas: la puerta del patio necesita la llave roja (que está en el puente), el hueco de la terraza es una pared secreta, 16 objetos y un interruptor de salida.

#### Cambiado

- `Mover.setProgress` coloca el cuerpo al instante (antes lo hacía en el siguiente paso de física).
- El indicador provisional de munición y el destello de daño se integran en el nuevo HUD.

### Fase 5 — Enemigos, animaciones, IA y navmesh

#### Añadido

- Cuatro enemigos originales construidos con primitivas en jerarquías (cadera, torso, cabeza, brazos y piernas):
  - Centinela: soldado con disparo instantáneo.
  - Rastrero: criatura rápida cuerpo a cuerpo.
  - Escupidor: lanza bolas de ácido.
  - Vigía: orbe volador que dispara descargas.
- Animaciones procedurales: caminar, atacar (disparo, zarpazo, escupitajo), dolor, destello al recibir daño y muerte con caída animada (el volador cae al suelo).
- IA con máquina de estados pura y testeada: reposo, patrulla, alerta, persecución, ataque, dolor y muerte.
- Percepción:
  - Cono de visión con raycast; una vez alerta, visión en todas direcciones.
  - Ruido de disparos y explosiones propagado por la malla de navegación: se oye por los pasillos, no a través de los muros.
- Peleas entre enemigos: si uno hiere a otro, se pelean hasta que uno muere y luego vuelven a por el jugador.
- Malla de navegación generada con recast-navigation-js a partir de la geometría del nivel, con repathing y detección de atascos. El volador se guía sin malla, manteniendo la altura.
- Ataques de los enemigos: disparos con dispersión (que también hieren a otros enemigos), golpes cuerpo a cuerpo y proyectiles propios con trazado por rayos para no atravesar paredes.
- Salud y armadura del jugador. Destello rojo al recibir daño, empuje y temblor de cámara.
- Muerte provisional del jugador: la cámara cae al suelo y reaparece al inicio a los 2,5 s. La pantalla de muerte llega en la fase 8.
- Cosas `enemy` en el formato de nivel, con puntos de patrulla. El nivel de pruebas tiene 9 enemigos.
- Enemigos vivos en el panel F3.

#### Cambiado

- `CharacterBody` admite grupos de colisión y un modo volador, y lo usan tanto el jugador como los enemigos.
- Las piezas de cada articulación de los enemigos se fusionan por material, y solo proyectan sombra las grandes: la mitad de draw calls.

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

[Sin publicar]: https://github.com/Carte1972/forja-abisal/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Carte1972/forja-abisal/releases/tag/v1.0.0
