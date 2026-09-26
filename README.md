# Forja Abisal

FPS 3D retro para el navegador, hecho con Three.js y Rapier. Tiene el ritmo de los shooters de los 90: niveles laberínticos y verticales, muchos enemigos, llaves y secretos. Todo el contenido (modelos, texturas, sonidos, niveles y nombres) es original y se genera por código.

<!-- CAPTURA: añade aquí una captura o GIF del juego, por ejemplo: ![Forja Abisal](docs/captura.gif) -->

> **Demo:** https://carte1972.github.io/forja-abisal/

> 🚧 **Estado:** en desarrollo. Fase actual: **6 — Puertas, llaves, objetos y HUD**. El nivel de pruebas ya se puede completar: llave roja, puerta, ascensor, pared secreta, objetos, lava, salida y pantalla de fin de nivel. Faltan los tres niveles de verdad, el sonido, los menús y el automapa.

## Controles

| Acción                                    | Tecla             | Estado       |
| ----------------------------------------- | ----------------- | ------------ |
| Moverse                                   | W A S D / flechas | ✅           |
| Mirar                                     | Ratón             | ✅           |
| Saltar                                    | Espacio           | ✅           |
| Agacharse                                 | C (o Ctrl)        | ✅           |
| Correr                                    | Shift             | ✅           |
| Pausa                                     | Esc               | ✅           |
| Disparar                                  | Clic izquierdo    | ✅           |
| Disparo alternativo                       | Clic derecho      | ✅           |
| Cambiar de arma                           | 1-5 / rueda       | ✅           |
| Recargar                                  | R                 | ✅           |
| Usar (puertas, ascensores, interruptores) | E                 | ✅           |
| Automapa                                  | Tab               | Próximamente |
| Estadísticas                              | F3                | ✅           |

> **¿Por qué C para agacharse?** En los navegadores, Ctrl+W cierra la pestaña y una página web no puede impedirlo. Ctrl también funciona, pero C es más seguro.

### Armas

| Tecla | Arma                   | Disparo principal                       | Disparo alternativo                               |
| ----- | ---------------------- | --------------------------------------- | ------------------------------------------------- |
| 1     | Martillo de pistón     | Golpe rápido                            | Golpe cargado, más lento y con empuje             |
| 2     | Pistola de servicio    | Tiro preciso (cargador de 12)           | Ráfaga de tres balas                              |
| 3     | Escopeta de dispersión | 8 perdigones (2 cartuchos)              | Los dos cañones a la vez                          |
| 4     | Remachadora            | Ráfaga continua (cargador de 50)        | Modo sobrecargado: más cadencia y menos precisión |
| 5     | Lanzacargas            | Carga explosiva que estalla al impactar | Carga rebotadora con espoleta                     |

- Cada arma recarga sola al vaciar el cargador. Con R se recarga antes.
- Sin munición, el arma hace clic en vacío y se cambia sola a otra que tenga balas (nunca al lanzacargas).
- Las explosiones empujan: disparar el lanzacargas al suelo justo después de saltar lanza al jugador por los aires (_rocket jump_).

### Objetivo y mecánicas

- **Objetivo:** llegar al **interruptor de salida** de cada nivel y pulsarlo con E. Al terminar, se muestran el tiempo y el porcentaje de enemigos eliminados, objetos recogidos y secretos encontrados.
- **Puertas:** se abren con E y se cierran solas al cabo de unos segundos. No se cierran si hay alguien debajo. Los enemigos también abren las puertas normales.
- **Llaves:** las puertas con franja de color necesitan la **llave roja, azul o amarilla**. Si no la tienes, verás un aviso.
- **Ascensores:** súbete y pulsa E (o empújalo con E desde abajo para que baje). Esperan unos segundos y vuelven.
- **Secretos:** algunas paredes esconden pasadizos que se abren con E. Entrar en una zona secreta cuenta para el porcentaje final.
- **Suelos peligrosos:** la lava y el ácido hacen daño mientras los pisas.
- **Objetos:**

| Objeto                                         | Efecto                                                          |
| ---------------------------------------------- | --------------------------------------------------------------- |
| Vial de suero                                  | +5 de salud (permite pasar de 100, hasta 200)                   |
| Botiquín / Botiquín de campaña                 | +25 / +50 de salud (hasta 100)                                  |
| Placa de blindaje                              | +5 de blindaje (hasta 200)                                      |
| Blindaje de forja                              | Blindaje al 100                                                 |
| Caja de munición, cartuchos, cargas explosivas | Munición para cada tipo de arma                                 |
| Escopeta, remachadora, lanzacargas             | El arma, con algo de munición (si es nueva, se saca al momento) |
| Llaves roja, azul y amarilla                   | Abren las puertas de su color                                   |

Los objetos que no necesitas (salud llena, munición al máximo) se quedan en el suelo. El blindaje absorbe un tercio del daño.

### HUD

- **Barra inferior:** munición y reserva, salud, icono del jugador, blindaje, armas que llevas (1-5, la actual resaltada) y llaves.
- **Icono del jugador:** un casco cuyo visor cambia de color con la salud y se agrieta. Mira hacia el lado del que te atacan.
- **Avisos visuales:** un arco rojo alrededor del punto de mira indica de dónde llega el daño. La pantalla destella en rojo al recibir daño y del color del objeto al recogerlo.

### Enemigos

| Enemigo   | Aspecto                                         | Ataque                               | Salud |
| --------- | ----------------------------------------------- | ------------------------------------ | ----- |
| Centinela | Soldado acorazado con visor rojo                | Ráfagas de tres disparos a distancia | 60    |
| Rastrero  | Criatura encorvada de brazos largos, muy rápida | Zarpazos cuerpo a cuerpo             | 45    |
| Escupidor | Mole con sacos de ácido brillantes              | Bolas de ácido que caen en parábola  | 130   |
| Vigía     | Orbe volador con un ojo y aletas giratorias     | Descargas de energía                 | 55    |

- **Percepción:** los enemigos te ven dentro de su cono de visión si nada se interpone, y oyen los disparos (el ruido viaja por los pasillos, no a través de las paredes).
- **Tras descubrirte:** te persiguen por la malla de navegación: suben escaleras, rodean columnas y siguen tu última posición conocida.
- **Si uno hiere a otro, se pelean entre ellos** hasta que uno muere.
- **Al recibir daño** a veces se encogen de dolor, lo que interrumpe su ataque.

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

## Cómo crear niveles nuevos

Cada nivel es un archivo JSON en `src/levels/`. Está formado por **sectores**: polígonos 2D con altura de suelo y de techo. El juego extruye las paredes entre sectores, crea los escalones cuando las alturas son distintas, triangula suelos y techos y genera las colisiones.

### Coordenadas

- En metros. `x` crece hacia el este y `z` hacia el **sur**; el norte es `-z`. `y` es la altura.
- Los ángulos van en grados: `0` mira al norte y `90` al oeste (sentido antihorario visto desde arriba).

### Ejemplo mínimo

Dos salas unidas por un escalón de 50 cm:

```json
{
  "version": 1,
  "name": "Mi nivel",
  "vertices": [
    [0, 0],
    [8, 0],
    [8, 8],
    [0, 8],
    [14, 0],
    [14, 8]
  ],
  "sectors": [
    {
      "vertices": [0, 1, 2, 3],
      "floor": { "height": 0, "texture": "stone_floor" },
      "ceiling": { "height": 4, "texture": "metal_ceiling" },
      "walls": "brick",
      "light": 0.8
    },
    {
      "vertices": [1, 4, 5, 2],
      "floor": { "height": 0.5, "texture": "metal_floor" },
      "ceiling": { "height": 4, "texture": "metal_ceiling" },
      "walls": "tech_wall"
    }
  ],
  "things": [{ "type": "player_start", "x": 4, "z": 6, "angle": 0 }]
}
```

> Los dos sectores comparten la arista entre los vértices 1 y 2. **Las aristas compartidas deben usar los mismos índices de vértice**: así es como el generador sabe que dos sectores están conectados.

### Campos del nivel

| Campo         | Tipo              | Descripción                                                 |
| ------------- | ----------------- | ----------------------------------------------------------- |
| `version`     | número            | Siempre `1`.                                                |
| `name`        | texto             | Nombre del nivel.                                           |
| `vertices`    | lista de `[x, z]` | Todos los vértices del nivel; se referencian por su índice. |
| `sectors`     | lista             | Los sectores (ver abajo).                                   |
| `slabs`       | lista (opcional)  | Losas: plataformas sólidas flotantes (ver abajo).           |
| `environment` | objeto (opcional) | Niebla, cielo, luz ambiental y sol (ver abajo).             |
| `things`      | lista             | Jugador, y más adelante enemigos, objetos y llaves.         |

### Campos de un sector

| Campo      | Tipo                                                    | Descripción                                                                                                                                     |
| ---------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `vertices` | lista de índices                                        | Contorno del sector, en cualquier sentido (se normaliza). Mínimo 3, sin cortes.                                                                 |
| `holes`    | lista de listas (opcional)                              | Huecos dentro del sector: columnas macizas, o el contorno de otro sector interior (por ejemplo, un foso).                                       |
| `floor`    | `{ height, texture, slope? }`                           | Suelo. `slope` lo convierte en rampa: `{ "from": [x, z], "to": [x, z], "toHeight": h }`. El suelo mide `height` en `from` y `toHeight` en `to`. |
| `ceiling`  | `{ height, texture, slope? }` o `{ height, sky: true }` | Techo. Con `sky: true` no hay techo y se ve el cielo; `height` marca hasta dónde suben las paredes exteriores.                                  |
| `walls`    | texto o `{ middle, upper?, lower? }`                    | Textura de las paredes. `lower` se usa en los escalones que suben hacia este sector y `upper` en los dinteles que cuelgan de su techo.          |
| `light`    | número 0–1 (opcional, 0,8)                              | Nivel de luz del sector.                                                                                                                        |
| `secret`   | booleano (opcional)                                     | Zona secreta: cuenta para el % de secretos al entrar.                                                                                           |
| `special`  | objeto (opcional)                                       | Comportamiento especial (ver abajo).                                                                                                            |
| `id`       | texto (opcional)                                        | Nombre para identificar el sector.                                                                                                              |

### Sectores especiales (`special`)

| `type`   | Campos                                                                         | Comportamiento                                                                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `damage` | `damagePerSecond`                                                              | Suelo que hace daño (lava, ácido).                                                                                                                                                                                     |
| `door`   | `key?` (`red`, `blue`, `yellow`), `speed?`, `waitTime?`, `texture?`, `hidden?` | Puerta que sube. El `ceiling.height` del sector es la altura abierta; empieza cerrada. `waitTime` son los segundos que tarda en cerrarse sola (0 = no se cierra). `hidden: true` la disfraza de pared (pared secreta). |
| `lift`   | `lowHeight`, `speed?`, `waitTime?`, `texture?`                                 | Ascensor: el suelo está arriba (`floor.height`) y baja hasta `lowHeight`.                                                                                                                                              |

Las puertas y los ascensores deben ser polígonos **convexos**, sin huecos y con suelo y techo planos.

### Losas (`slabs`)

Una losa es un bloque sólido flotante: permite pasar por encima y por debajo, como en un puente o un balcón.

| Campo      | Tipo                            | Descripción                                               |
| ---------- | ------------------------------- | --------------------------------------------------------- |
| `vertices` | lista de índices                | Contorno de la losa.                                      |
| `bottom`   | número                          | Altura de la cara inferior.                               |
| `top`      | número                          | Altura de la cara superior.                               |
| `texture`  | texto o `{ top, bottom, side }` | Texturas.                                                 |
| `light`    | número (opcional)               | Si no se indica, se usa la luz del sector en el que está. |

### Cosas (`things`)

| Campo    | Tipo              | Descripción                                                                                                                                                    |
| -------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`   | texto             | `player_start` (obligatorio y único), `lamp` (lámpara), `enemy` (enemigo), `pickup` (objeto), `exit` (interruptor de salida) o `model` (modelo glTF opcional). |
| `x`, `z` | número            | Posición. Debe estar dentro de un sector.                                                                                                                      |
| `y`      | número (opcional) | Altura; por defecto, la del suelo del sector.                                                                                                                  |
| `angle`  | grados (opcional) | Orientación.                                                                                                                                                   |

El resto de campos se guardan como propiedades. Por ejemplo, un `model` usa `url` (ruta dentro de `public/`, por ejemplo `models/estatua.glb`) y `scale`.

El `player_start` admite el inventario inicial: `"weapons": ["pistol", "shotgun", "riveter", "launcher"]` (el martillo va siempre) y `"ammo": { "bullets": 50, "shells": 10, "charges": 4 }`. Si no se indica, se empieza con martillo, pistola y 50 balas.

#### Objetos (`"type": "pickup"`)

`item` es uno de: `health_small`, `health`, `health_large`, `armor_small`, `armor`, `ammo_bullets`, `ammo_shells`, `ammo_charges`, `weapon_shotgun`, `weapon_riveter`, `weapon_launcher`, `key_red`, `key_blue` o `key_yellow`. Con `y` se puede colocar encima de una losa.

Ejemplo: `{ "type": "pickup", "item": "key_red", "x": 7.25, "z": -9.5, "y": 2 }`

#### Salida (`"type": "exit"`)

Interruptor que termina el nivel al pulsarlo con E. `angle` indica hacia dónde mira su pantalla. Todo nivel necesita al menos uno.

#### Enemigos (`"type": "enemy"`)

| Campo    | Tipo                         | Descripción                                                                                                      |
| -------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `kind`   | texto                        | `sentinel` (centinela), `crawler` (rastrero), `spitter` (escupidor) o `watcher` (vigía, volador).                |
| `angle`  | grados                       | Hacia dónde mira al empezar (solo ve dentro de su cono de visión).                                               |
| `patrol` | lista de `[x, z]` (opcional) | Puntos de patrulla: el enemigo va y viene entre su posición inicial y estos puntos. Sin patrulla, espera quieto. |

Ejemplo: `{ "type": "enemy", "kind": "sentinel", "x": 3, "z": 1.5, "angle": 180, "patrol": [[13, 1.5]] }`

#### Lámparas (`"type": "lamp"`)

Por defecto, una lámpara cuelga del techo de su sector. En zonas con cielo se coloca sobre una farola de 3 m. Con `y` se fija su altura exacta.

| Campo       | Tipo        | Por defecto | Descripción                                                                                                        |
| ----------- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `color`     | `"#rrggbb"` | `#ffd8a8`   | Color de la luz y de la pantalla.                                                                                  |
| `intensity` | número      | `1`         | Intensidad relativa.                                                                                               |
| `radius`    | número      | `10`        | Alcance en metros.                                                                                                 |
| `flicker`   | texto       | `steady`    | `steady` (fija), `flicker` (tiembla), `pulse` (late), `strobe` (intermitente) o `broken` (averiada, con apagones). |
| `shadows`   | booleano    | `false`     | Proyecta sombras. Resérvalo para las luces principales: solo una lámpara a la vez puede tener sombra real.         |

Solo las 6 lámparas más cercanas a la cámara iluminan de verdad. Las demás se siguen viendo encendidas por su pantalla brillante.

### Entorno (`environment`)

Todos los campos son opcionales. Los colores van en formato `"#rrggbb"`.

| Campo                                  | Por defecto      | Descripción                                                                                                                                                                        |
| -------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fog.color`                            | `#1b1512`        | Color de la niebla y del fondo.                                                                                                                                                    |
| `fog.near`, `fog.far`                  | `14`, `75`       | Distancia (m) a la que empieza la niebla y a la que ya lo tapa todo.                                                                                                               |
| `sky.top`, `sky.horizon`, `sky.bottom` | tonos de brasa   | Degradado del cielo procedural.                                                                                                                                                    |
| `sky.clouds`                           | `0.55`           | Nubosidad, de 0 (despejado) a 1 (cubierto).                                                                                                                                        |
| `ambient.color`, `ambient.intensity`   | `#c8b8ac`, `0.9` | Luz ambiental base. Se multiplica por la `light` de cada sector.                                                                                                                   |
| `sun`                                  | sol cálido       | `{ "color", "intensity", "direction": [x, y, z] }` o `null` para no tener sol. Solo existe si el nivel tiene sectores con cielo. Proyecta sombras, así que no entra en interiores. |

### Texturas disponibles

Todas se generan por código al arrancar. Un nombre desconocido se muestra con un damero magenta (`missing`) y un aviso en la consola.

`brick`, `stone_floor`, `stone_step`, `metal_floor`, `metal_ceiling`, `metal_grate`, `tech_wall` (con tiras luminosas), `tech_panel` (circuitos), `door_metal`, `door_frame`, `lift_top`, `rock`, `dirt`, `lava` y `acid` (emisivas y animadas).

Cada textura mide 64×64 píxeles y cubre 2×2 metros. La de las puertas visibles se ajusta al tamaño de la hoja.

### Errores

Al cargar, el nivel se valida y los errores se muestran todos juntos, con la ruta del campo afectado. Se comprueba, entre otras cosas:

- Que los índices de vértice existen.
- Que los polígonos no se cortan.
- Que no hay **uniones en T**: un vértice apoyado en mitad de la arista de otro sector. Hay que añadir ese vértice también al otro sector.
- Que ningún sector se solapa con otro.
- Que el techo queda por encima del suelo.
- Que hay exactamente un `player_start`.

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
