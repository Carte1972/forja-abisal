# Forja Abisal

FPS 3D retro para el navegador, hecho con Three.js y Rapier. Tiene el ritmo de los shooters de los 90: niveles laberínticos y verticales, muchos enemigos, llaves y secretos. Todo el contenido (modelos, texturas, sonidos, niveles y nombres) es original y se genera por código.

<!-- CAPTURA: añade aquí una captura o GIF del juego, por ejemplo: ![Forja Abisal](docs/captura.gif) -->

> **Demo:** https://&lt;usuario&gt;.github.io/&lt;repositorio&gt;/ _(disponible cuando se publique el repositorio)_

> 🚧 **Estado:** en desarrollo. Fase actual: **2 — Generador de niveles**. Hay un nivel de pruebas generado desde sectores, con escaleras, rampa, foso de lava con puente, patio exterior y terraza. Todavía no hay texturas, armas ni enemigos, y las puertas y los ascensores aún no se accionan.

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

| Campo      | Tipo              | Descripción                                                 |
| ---------- | ----------------- | ----------------------------------------------------------- |
| `version`  | número            | Siempre `1`.                                                |
| `name`     | texto             | Nombre del nivel.                                           |
| `vertices` | lista de `[x, z]` | Todos los vértices del nivel; se referencian por su índice. |
| `sectors`  | lista             | Los sectores (ver abajo).                                   |
| `slabs`    | lista (opcional)  | Losas: plataformas sólidas flotantes (ver abajo).           |
| `things`   | lista             | Jugador, y más adelante enemigos, objetos y llaves.         |

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

| Campo    | Tipo              | Descripción                                                                                                                   |
| -------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `type`   | texto             | `player_start` (obligatorio y único) o `model` (modelo glTF opcional). Los enemigos y objetos llegarán en las próximas fases. |
| `x`, `z` | número            | Posición. Debe estar dentro de un sector.                                                                                     |
| `y`      | número (opcional) | Altura; por defecto, la del suelo del sector.                                                                                 |
| `angle`  | grados (opcional) | Orientación.                                                                                                                  |

El resto de campos se guardan como propiedades. Por ejemplo, un `model` usa `url` (ruta dentro de `public/`, por ejemplo `models/estatua.glb`) y `scale`.

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
