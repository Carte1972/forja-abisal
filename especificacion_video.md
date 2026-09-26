# Especificación: vídeo de presentación de Forja Abisal

> Este documento es la especificación del vídeo de presentación del juego y la fuente de verdad para este trabajo. Léelo entero antes de empezar y consúltalo en cada fase. No lo modifiques: si detectas algo contradictorio o que no se puede cumplir, pregúntame.

## Objetivo

Crear un vídeo de presentación de Forja Abisal de 2-3 minutos que cuente la historia del juego y enseñe, con imágenes reales del juego, los controles, las armas, los enemigos, los tres niveles con sus planos y los trucos. El vídeo se genera por código dentro de este repositorio:

- **El propio juego graba sus clips** mediante un modo de grabación con recorridos de cámara y escenas preparadas.
- **Remotion monta el vídeo** con esos clips, textos, tablas animadas, los planos de los niveles y la narración.

Este trabajo cubre dos pasos:

1. **Historia y guion**, que decidiremos juntos.
2. **Vídeo completo con una voz provisional** (la voz Reed de español de España de macOS), que más adelante sustituiré por mi propia voz grabada.

La grabación de mi voz y su procesado (limpieza, volumen, subtítulos) se harán en un trabajo posterior. Deja la estructura preparada para ello, pero no lo implementes todavía.

## Reglas generales

1. Antes de escribir código, muéstrame un plan con la arquitectura, la estructura de carpetas, las dependencias y las fases. Espera mi OK.
2. Si algo es ambiguo, pregúntame en lugar de inventar.
3. No instales nada fuera de las dependencias npm del proyecto sin pedirme permiso. Esto incluye ffmpeg, Python, Homebrew o voces del sistema. Si Remotion trae su propio ffmpeg, úsalo.
4. No envíes nada por red salvo las descargas normales de npm.
5. Todo el contenido del vídeo debe ser **original**: imágenes del propio juego, textos propios y tipografías con licencia libre (por ejemplo, de Google Fonts). No uses música, efectos de sonido, imágenes ni vídeos de terceros. Si hay música, se sintetiza por código, como los sonidos del juego.
6. Respeta las convenciones de `CLAUDE.md`: TypeScript estricto, ESLint, Prettier, nombres de archivos en snake_case y Conventional Commits en español.
7. No rompas el juego: el modo de grabación no debe afectar a la partida normal, los tests existentes deben seguir pasando y el build de GitHub Pages debe seguir funcionando.

## Git

- Trabaja en una rama nueva, `feature/video`, creada desde `main`.
- Haz commit al final de cada fase, solo si los tests, el lint y el typecheck pasan.
- No subas al repositorio los clips grabados, los audios generados ni el MP4 final: añádelos al `.gitignore`. Solo se versiona el código, el guion y la configuración, porque todo lo demás se regenera con comandos.
- No hagas push ni merge a `main` sin pedírmelo.

## Fase 1: historia y guion

Esta fase no tiene código. Es de escritura y la decidimos juntos.

### 1.1 Propuestas de historia

Lee el README, `INSTRUCCIONES.md`, los niveles, los enemigos y las armas del juego, y propónme **tres enfoques de historia** con tonos distintos:

- **Terror industrial:** oscuro, opresivo y misterioso.
- **Épico:** heroico, con la sensación de una misión desesperada.
- **Con humor:** irónico, con guiños al género, sin dejar de ser un shooter.

Cada propuesta debe tener un título, un resumen de 5-8 líneas, quién es el protagonista, qué es la Forja Abisal, qué pasó allí, por qué desciende y qué le espera en el Núcleo Abisal. Debe ser coherente con lo que ya existe en el juego: los nombres de los niveles (Fundición Cero, Pozos de Ceniza, Núcleo Abisal), los enemigos (centinela, rastrero, escupidor, vigía), las armas (martillo de pistón, pistola de servicio, escopeta de dispersión, remachadora, lanzacargas), la lava, el ácido y la fundición. No inventes elementos que contradigan el juego.

Espera a que elija una propuesta o te pida cambios.

### 1.2 Guion

Con la historia elegida, escribe `video/guion.md` con estas 7 escenas:

| Escena | Duración orientativa | Contenido |
| --- | --- | --- |
| 1. Gancho | 10 s | Un momento espectacular del juego, por ejemplo, un rocket jump sobre el lago de lava del Núcleo Abisal. |
| 2. Historia | 30 s | Qué es la Forja Abisal y por qué desciende el protagonista. |
| 3. Controles y armas | 30 s | Controles básicos y las 5 armas con su disparo alternativo. |
| 4. Enemigos | 20 s | Los 4 enemigos y su comportamiento. |
| 5. Los tres niveles | 45 s | Cada nivel con su plano y sus zonas más llamativas. |
| 6. Trucos | 30 s | Secretos, enemigos que se pelean entre ellos, rocket jump y automapa. |
| 7. Cierre | 10 s | Enlace a la demo y al repositorio. |

Para cada escena, el guion debe indicar:

- **Narración:** el texto exacto que se dirá, en español de España, pensado para ser leído en voz alta (frases cortas, sin paréntesis ni siglas difíciles de pronunciar). Calcula la duración a unas 150 palabras por minuto y ajústala a la duración orientativa.
- **Imagen:** qué se ve en pantalla (clip del juego, plano, tabla, texto…), con suficiente detalle para producirlo.
- **Textos en pantalla:** títulos, rótulos y datos que aparecen sobreimpresos.
- **Nombre del archivo de narración** de esa escena, siguiendo el formato `escena_01_gancho.wav`, `escena_02_historia.wav`, etc.

Espera a que revise y apruebe el guion antes de pasar a la fase 2. Haz commit del guion aprobado.

## Fase 2: modo de grabación en el juego

Añade al juego un modo de grabación que produzca los clips de vídeo de cada escena de forma automática y reproducible.

- Se activa con un parámetro en la URL (por ejemplo, `?grabar=nombre_del_clip`) y solo en el entorno de desarrollo o en un build específico de grabación, nunca en la versión publicada en GitHub Pages.
- Cada clip se define en un archivo de datos (por ejemplo, `video/clips/*.json` o TypeScript) con el nivel, los recorridos de cámara (puntos, orientación, velocidad y suavizado), las acciones escenificadas (disparos, enemigos que aparecen, rocket jump, apertura de un secreto, peleas entre enemigos, automapa abierto…) y la duración.
- **La grabación debe ser determinista y sin saltos**: la simulación avanza paso a paso a una tasa fija, independientemente de la velocidad del ordenador, y se captura cada fotograma. Propónme en el plan la técnica de captura que consideres mejor (por ejemplo, avanzar el bucle manualmente y exportar cada fotograma del canvas) y justifícala.
- Resolución de salida: 1920×1080 a 60 fps.
- Oculta el HUD y el cursor salvo que el clip los necesite (por ejemplo, para explicar el HUD).
- Un script (por ejemplo, `npm run video:clips`) graba todos los clips seguidos, sin intervención, y los deja en `video/public/clips/`.
- Añade tests para la lógica pura del modo de grabación (interpolación de recorridos de cámara y temporización de acciones).

Graba los clips que pida el guion y enséñame un fotograma de cada uno antes de dar la fase por terminada.

## Fase 3: proyecto de Remotion

Crea el proyecto de vídeo en la carpeta `video/`, dentro de este mismo repositorio.

- Remotion con React y TypeScript, integrado con las herramientas del proyecto (lint, typecheck y formato).
- Una composición principal de 1920×1080 a 60 fps, con un componente por escena.
- **Estilo visual coherente con el juego:** paleta de brasas, metal y ácido, tipografía con carácter industrial y animaciones sobrias. Transiciones entre escenas cortas y con sentido (fundidos, cortes a negro, destellos de fundición).
- **Contenido de cada escena:**
  - Gancho y cierre con título del juego animado.
  - Historia con clips del juego y textos que refuercen la narración.
  - Tablas animadas de controles y armas.
  - Fichas de enemigos con su clip, su nombre y una línea de comportamiento.
  - Los planos SVG de los niveles que ya existen en `docs/`, animados, sobre imágenes del nivel.
  - Trucos, cada uno con su clip y un rótulo.
- **La duración de cada escena la marca su narración:** usa `calculateMetadata` (o el mecanismo equivalente de Remotion) para leer la duración de cada archivo de audio de `video/public/narracion/` y ajustar la escena, con un pequeño margen antes y después. Así, cuando sustituya la voz provisional por la mía, el vídeo se reajustará solo.
- Deja preparado el sitio para subtítulos (un componente que lea un archivo de subtítulos por escena si existe), aunque no se generen en este trabajo.
- Música opcional: si la añades, sintetízala por código con el motor de audio del juego o con Web Audio, y baja su volumen automáticamente mientras hay narración.

## Fase 4: voz provisional

- Genera la narración de cada escena con una voz de español de España de macOS usando el comando `say`, leyendo el texto exacto del guion, y guarda cada escena en `video/public/narracion/` con el nombre indicado en el guion.
- Usa la voz **Reed** de español de España (`say -v "Reed (Español (España))"`) a su **velocidad normal**, sin la opción `-r`. Ya la he probado y está instalada en mi Mac. Deja la voz y la velocidad configurables en un archivo de configuración, por si más adelante quiero cambiarlas.
- Si en algún momento la voz Reed no estuviera disponible, no instales nada ni la sustituyas por otra: avísame y espera.
- Mi Terminal usa zsh. Si escribes scripts de shell, que funcionen en zsh, o indica bash explícitamente en la primera línea (`#!/bin/bash`).
- Esta voz es solo provisional, para cuadrar los tiempos del montaje. Su calidad no es importante.
- Un script (por ejemplo, `npm run video:voz`) regenera toda la narración provisional a partir de `video/guion.md`, para que cualquier cambio en el guion se refleje con un comando.
- **Los archivos de voz provisional deben poder sustituirse** por los míos simplemente dejando mis grabaciones con el mismo nombre en la misma carpeta. Añade un mecanismo sencillo para que el script de voz provisional no sobrescriba una grabación mía (por ejemplo, guardar las mías en `video/narracion_real/` y dar prioridad a esa carpeta, o marcar los archivos provisionales).

## Fase 5: render y documentación

- Script `npm run video:render` que genere el MP4 final en `video/out/forja_abisal_presentacion.mp4` (H.264, 1080p, 60 fps, audio AAC).
- Script `npm run video` que haga todo el proceso de principio a fin: clips, voz provisional (si no hay voz real) y render.
- Añade una sección "Vídeo de presentación" al `README.md` principal y un `video/README.md` que explique:
  - Cómo funciona el proceso (clips → narración → Remotion → MP4).
  - Cómo editar el guion y regenerar el vídeo.
  - Cómo abrir Remotion Studio para previsualizar y ajustar escenas.
  - Cómo sustituir la voz provisional por grabaciones reales: nombres de archivo, formato recomendado (WAV, 48 kHz, mono) y consejos básicos para grabar en casa.
  - Cómo añadir clips nuevos al modo de grabación.
- Actualiza `CHANGELOG.md` y `CLAUDE.md` con lo nuevo.
- Renderiza el vídeo completo, compruébalo y enséñame 4-5 fotogramas representativos antes de dar el trabajo por terminado.

## Al terminar cada fase

Dame un resumen corto de lo hecho, el mensaje del commit y cómo verlo o probarlo (por ejemplo, `npx remotion studio` para previsualizar o la ruta del MP4).
