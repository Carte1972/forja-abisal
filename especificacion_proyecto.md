# Especificación del proyecto: FPS 3D retro en el navegador

> Este documento es la especificación completa del proyecto y la fuente de verdad. Léelo entero antes de empezar y consúltalo en cada fase. No lo modifiques: si detectas algo contradictorio o que no se puede cumplir, pregúntame.

## Objetivo

Quiero que construyas un FPS en 3D para el navegador con Three.js, inspirado en el ritmo y la sensación de los shooters de los 90 (tipo Doom): rápido, con niveles laberínticos y verticales, muchos enemigos, llaves y secretos. La experiencia debe ser 3D completa: mirar arriba y abajo, saltar, alturas variables, iluminación dinámica y audio posicional.

Todo el contenido (modelos, texturas, sonidos, nombres, niveles) debe ser **ORIGINAL**: no uses assets, nombres, niveles ni diseños de Doom ni de ningún otro juego. El proyecto será público en GitHub, así que esto es imprescindible.

## Antes de escribir código

1. Muéstrame un plan con la arquitectura, la estructura de carpetas, las dependencias y las fases. Espera mi OK.
2. Si algo es ambiguo, pregúntame en lugar de inventar.
3. No instales nada fuera de las dependencias npm del proyecto sin pedirme permiso.
4. Pregúntame qué licencia quiero para el repositorio (propón MIT por defecto).

## Git y GitHub

- Inicializa un repositorio git en esta carpeta antes de empezar, con rama principal `main`.
- Crea un `.gitignore` adecuado (node_modules, dist, .env, .DS_Store, logs, cachés de Vite y del editor).
- Haz un commit al terminar cada fase, solo cuando el juego arranque sin errores y los tests pasen. Usa mensajes en formato Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`), por ejemplo `feat: fase 2 - generador de niveles por sectores`.
- Si dentro de una fase hay cambios grandes e independientes, haz commits intermedios con sentido propio.
- No hagas push ni crees el repositorio remoto sin pedírmelo. Cuando te lo pida, comprueba primero si tengo instalada y autenticada la CLI `gh`; si no, dime los comandos para hacerlo yo a mano.
- Nunca subas secretos, claves ni archivos locales de configuración personal.
- Configura el despliegue en GitHub Pages con un workflow de GitHub Actions (build con Vite y publicación de `/dist`), con el `base` de Vite configurado para el nombre del repositorio.
- Añade también un workflow de CI que ejecute lint, typecheck y tests en cada push y pull request.

## Stack

- Vite + TypeScript (strict), con ESLint y Prettier.
- Three.js para el render. Post-procesado con EffectComposer (o la librería postprocessing).
- Física y colisiones con Rapier (`@dimforge/rapier3d-compat`), usando su KinematicCharacterController para el jugador.
- React solo para la interfaz fuera del juego: menú principal, opciones, pausa y pantallas de fin de nivel. El HUD puede ser un overlay HTML/CSS o una escena ortográfica, lo que tenga mejor rendimiento.
- Web Audio API con sonidos sintetizados por código, reproducidos como `THREE.PositionalAudio` para que se oigan en 3D.
- Vitest para los tests de la lógica pura.
- Nombres de archivos en snake_case.

## Niveles (geometría 3D generada desde datos)

- Cada nivel es un archivo JSON con sectores: polígonos 2D con altura de suelo, altura de techo, texturas de suelo/techo/paredes, nivel de luz y tipo especial (daño, ascensor, puerta, secreto).
- Un generador convierte los sectores en mallas 3D: extruye las paredes entre sectores contiguos (incluidos los escalones entre alturas distintas), triangula suelos y techos y crea los colliders de Rapier.
- Soporte para: escaleras, rampas, balcones, fosos, ascensores que suben y bajan, puertas que se abren verticalmente, paredes secretas y suelos que hacen daño (lava/ácido con emisivo animado).
- Zonas exteriores con cielo (skybox procedural) y zonas interiores con techo.
- Fusiona las geometrías estáticas por material para reducir draw calls.
- Deja preparado un cargador glTF opcional por si en el futuro quiero añadir modelos hechos en Blender.
- Crea 3 niveles originales con dificultad creciente, aprovechando la verticalidad, con puertas de llave (roja, azul, amarilla) y al menos 2 secretos por nivel.

## Visual

- Texturas procedurales generadas en canvas al arrancar (metal, piedra, tecnológico, ladrillo, rejillas, lava…), con filtrado NearestFilter para un aspecto retro nítido, más normal maps sencillos derivados de ellas.
- Iluminación: luz ambiental baja, luces puntuales en las lámparas del nivel, luces que parpadean, una luz breve en cada disparo (muzzle flash) y en las explosiones. Sombras solo en las luces principales, por rendimiento.
- Niebla por distancia.
- Post-procesado: bloom para emisivos y disparos, viñeta y un filtro de pixelado opcional (activable en las opciones).
- Partículas: chispas en impactos, sangre de color no realista (verde/azul) en enemigos, humo y explosiones.
- Decals de impacto de bala en las paredes (con límite máximo).

## Jugador

- Controles: WASD para moverse, ratón para mirar (Pointer Lock, eje Y con límites), Espacio para saltar, Ctrl para agacharse, Shift para correr, clic para disparar, clic derecho para el disparo alternativo, 1-5 o rueda para cambiar de arma, E para usar, Tab para el automapa, Esc para pausa.
- Movimiento rápido y con inercia al estilo arcade, con head bobbing y retroceso de cámara al disparar (ambos desactivables).
- Armas modeladas en 3D con primitivas (low-poly, diseño propio) en una capa de cámara separada para que no atraviesen las paredes. Animaciones de balanceo, disparo, recarga y cambio.
- 5 armas: cuerpo a cuerpo, pistola, escopeta (dispersión), ametralladora y lanzador de proyectiles explosivos con daño en área y empuje (rocket jump posible).
- Hitscan mediante raycast de Rapier. Los proyectiles son entidades con su propia física.

## Enemigos

- Modelos low-poly construidos por código con primitivas agrupadas en jerarquías (cabeza, torso, brazos, piernas), con animaciones procedurales: caminar, atacar, recibir daño y morir (ragdoll simple o caída animada). Diseños originales: criaturas y soldados propios.
- Mínimo 4 tipos: soldado hitscan, criatura cuerpo a cuerpo rápida, enemigo que lanza proyectiles y enemigo volador.
- IA con máquina de estados (idle, patrulla, alerta por ruido o visión, persecución, ataque, dolor, muerte), visión con cono y raycast, y navegación en 3D con navmesh (por ejemplo, three-pathfinding o recast-navigation-js) generado a partir de la geometría del nivel.
- Los enemigos reaccionan al ruido de los disparos, y si uno daña a otro, se pelean entre ellos.

## Pickups y HUD

- Pickups flotantes y girando: salud, armadura, munición, armas y llaves.
- HUD: salud, armadura, munición, llaves, arma actual y un icono del jugador que reacciona al daño (diseño original). Punto de mira dinámico.
- Indicador de dirección del daño, flash rojo al recibir daño y flash de color al recoger objetos.
- Automapa en 2D generado a partir de los sectores.
- Pantalla de fin de nivel con tiempo, % de enemigos, % de objetos y % de secretos.

## Calidad

- Arquitectura por sistemas: separa el motor (render, física, audio, input, carga de niveles) de la lógica de juego (entidades, IA, armas, reglas).
- Tests con Vitest para: triangulación y extrusión de sectores, parser de niveles, lógica de armas, máquina de estados de la IA y reglas de pickups.
- Scripts npm: `dev`, `build`, `preview`, `test`, `lint`, `typecheck`.
- Objetivo: 60 FPS estables en un portátil moderno. Opciones de calidad (sombras, post-procesado, resolución). Panel de estadísticas activable con F3 (FPS, draw calls, triángulos).

## Documentación

- `README.md` completo, en español, con estas secciones:
  1. Descripción del juego y captura o GIF (déjame un hueco marcado para añadirla) y enlace a la demo en GitHub Pages.
  2. Qué hay que hacer: objetivo del juego, cómo se superan los niveles, llaves, secretos y puntuación.
  3. Funcionalidad: armas, enemigos, pickups, mecánicas (puertas, ascensores, suelos de daño), opciones y automapa.
  4. Controles, en una tabla.
  5. Instalación y ejecución:
     - Opción rápida: doble clic en el lanzador según el sistema operativo (ver sección Lanzador).
     - Opción manual: requisitos (versión de Node.js), `npm install`, `npm run dev`, `npm run build`, `npm run preview`.
     - Solución de problemas: aviso de seguridad de macOS la primera vez, Node no instalado, puerto ocupado.
  6. Arquitectura: diagrama en Mermaid de los sistemas (render, física, audio, input, niveles, entidades, IA, armas, UI), explicación del game loop, del flujo de carga de un nivel y del generador de geometría por sectores, y árbol de carpetas comentado.
  7. Cómo crear niveles nuevos: formato JSON explicado campo a campo con un ejemplo mínimo.
  8. Desarrollo: scripts npm, tests, lint, convenciones de commits y cómo contribuir.
  9. Créditos (todo el contenido es original) y licencia.
- `LICENSE` con la licencia que yo elija.
- `CLAUDE.md` con las convenciones del proyecto (stack, estructura, comandos, reglas de assets originales y de commits) y una referencia a este archivo de especificación, para que futuras sesiones de Claude Code trabajen igual.
- `CHANGELOG.md` actualizado en cada fase.

## Lanzador de doble clic

- Crea en la raíz del proyecto:
  - `jugar.command` para macOS (se abre con doble clic en Finder).
  - `jugar.bat` para Windows.
  - `jugar.sh` para Linux.
- Cada lanzador debe:
  1. Situarse en la carpeta del proyecto, aunque se ejecute desde otro sitio.
  2. Comprobar que Node.js está instalado y con la versión mínima. Si no lo está, mostrar un mensaje claro con el enlace de descarga y esperar a que el usuario pulse una tecla antes de cerrar. No debe instalar Node automáticamente.
  3. Ejecutar `npm install` solo si falta `node_modules` o si `package-lock.json` es más reciente.
  4. Hacer el build de producción solo si no existe `/dist` o si el código fuente ha cambiado desde el último build.
  5. Servir `/dist` en local (con `vite preview` o equivalente, sin dependencias globales), buscar un puerto libre y abrir el navegador por defecto automáticamente.
  6. Mostrar en la terminal la URL y cómo cerrar el juego (Ctrl+C o cerrar la ventana).
- Los archivos `.command` y `.sh` deben tener permiso de ejecución y guardarlo en git (`git update-index --chmod=+x`), para que sigan siendo ejecutables al clonar el repositorio.
- Explica en el README que en macOS, la primera vez, puede que haya que hacer clic derecho → Abrir para saltarse el aviso de Gatekeeper.
- Prueba el lanzador de macOS en este equipo antes de dar la fase por terminada.

## Fases

Ejecuta el juego y verifica cada fase antes de pasar a la siguiente. Haz commit al final de cada una.

0. **Setup:** git, Vite + TypeScript, ESLint, Prettier, Vitest, `.gitignore`, `CLAUDE.md`, `README.md` inicial y workflows de CI y GitHub Pages.
1. **Escena base:** Three.js + Rapier, jugador con controlador de personaje, salto y colisiones en una sala de prueba. Crea ya el lanzador `jugar.command` para poder probar con doble clic desde el principio.
2. **Generador de niveles** a partir de sectores: alturas, escaleras, rampas y colliders.
3. **Texturas procedurales**, iluminación, niebla y post-procesado.
4. **Armas** en primera persona, disparo hitscan y proyectiles, impactos y partículas.
5. **Enemigos** con modelos, animaciones, IA y navmesh.
6. **Puertas, ascensores, llaves, secretos, pickups, HUD** y salida de nivel.
7. **Los 3 niveles** completos.
8. **Audio posicional, menús, opciones, automapa** y pulido de rendimiento.
9. **Cierre:** lanzadores de Windows y Linux, README completo con todas sus secciones, CHANGELOG y verificación del build de producción y del lanzador de macOS.

Actualiza el README al final de cada fase con lo que haya cambiado, para que nunca quede desfasado.

Al terminar cada fase, dame un resumen corto de lo hecho, el mensaje del commit y cómo probarlo (doble clic en `jugar.command` o `npm run dev`).
