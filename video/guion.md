# Guion: vídeo de presentación de Forja Abisal

**Historia:** «Lo que arde abajo» (terror industrial: oscuro, opresivo y misterioso).

Hace tres semanas que la Forja Abisal dejó de responder, pero sus hornos siguen encendidos. Un técnico de mantenimiento del turno de relevo baja a averiguar por qué. Nada más entrar, el montacargas de subida se desploma a su espalda: la única salida está en el fondo, al otro lado del Núcleo. Los centinelas siguen haciendo su ronda, aunque ya no queda nadie a quien proteger; en los Pozos de Ceniza algo se arrastra entre el ácido; y cuanto más baja, más calor hace y más fuerte se oye un zumbido, como si la forja respirara.

**Voz:** narración en segunda persona, pausada y grave. **Música:** base sintetizada (dron industrial y percusión metálica) que baja de volumen mientras hay narración. **Sin efectos de sonido del juego.**

**Continuidad:** la narración es un único relato. Cada escena arranca enlazando con la anterior («Ese alguien eres tú», «Para afrontar este reto», «Y las vas a necesitar», «Para escapar», «Por suerte, llevas años en el oficio»), y el cierre se despide del técnico con un guiño siniestro: si no vuelve, habrá corrido la misma suerte que el resto de trabajadores.

**Pausas:** los puntos suspensivos del cierre marcan pausas largas; la voz de macOS las respeta.

**Cómo se usa este archivo:** `npm run video:voz` lee el texto de cada bloque «Narración» (las líneas que empiezan por `>`) y genera el archivo indicado en «Archivo de narración». Si cambias una narración, vuelve a ejecutarlo. Las duraciones se calculan a 150 palabras por minuto; la duración real de cada escena la marca su audio.

## Resumen

| Escena               | Archivo de narración              | Duración orientativa | Palabras | Duración estimada |
| -------------------- | --------------------------------- | -------------------- | -------- | ----------------- |
| 1. Gancho            | `escena_01_gancho.wav`            | 10 s                 | 23       | 9 s               |
| 2. Historia          | `escena_02_historia.wav`          | 30 s                 | 75       | 30 s              |
| 3. Controles y armas | `escena_03_controles_y_armas.wav` | 30 s                 | 77       | 31 s              |
| 4. Enemigos          | `escena_04_enemigos.wav`          | 20 s                 | 55       | 22 s              |
| 5. Los tres niveles  | `escena_05_niveles.wav`           | 45 s                 | 100      | 40 s              |
| 6. Trucos            | `escena_06_trucos.wav`            | 30 s                 | 70       | 28 s              |
| 7. Cierre            | `escena_07_cierre.wav`            | 10 s                 | 26       | 10 s              |
| **Total**            |                                   | **2 min 55 s**       | **426**  | **2 min 50 s**    |

## Escena 1 — Gancho

**Archivo de narración:** `escena_01_gancho.wav` · **Duración orientativa:** 10 s

### Narración

> Hace tres semanas que la Forja Abisal dejó de responder. Sus hornos siguen encendidos. Y alguien tiene que bajar a ver por qué.

### Imagen

- Negro. Un zumbido grave de la música crece.
- **Clip `gancho_salto_carga`** (Núcleo Abisal, vista del jugador, sin HUD, con el arma): el jugador corre por la pasarela sur del lago de lava hacia la isla, salta, dispara el lanzacargas al suelo y sale despedido por encima de la lava. La cámara ve pasar la lava por debajo y la torre de frente; aterriza en la isla.
- Corte a negro con un destello de fundición y aparece el título.

### Textos en pantalla

- Título animado al final: **FORJA ABISAL**, en letras metálicas que se encienden como el metal al rojo.

## Escena 2 — Historia

**Archivo de narración:** `escena_02_historia.wav` · **Duración orientativa:** 30 s

### Narración

> Ese alguien eres tú, el técnico de mantenimiento del turno de relevo. La Forja Abisal es una fundición excavada en la roca que, un día, empezó a trabajar sola. Los guardias siguen de ronda, aunque ya no queda nadie a quien proteger. A los obreros no se les ha vuelto a ver. Al menos, no con forma humana. Nada más entrar, el montacargas se desploma a tu espalda. La única salida está en el fondo.

### Imagen

Cuatro planos encadenados con fundidos, cada uno de 6 a 8 segundos:

1. **Clip `historia_fundicion`** (Fundición Cero, cámara libre): travelling lento por la nave de la fundición, del puente de rejilla hacia la galería, con el canal de lava brillando abajo.
2. **Clip `historia_ronda`** (Fundición Cero, cámara libre, baja y detrás de una columna): un centinela patrulla la galería elevada, de espaldas, con su visor rojo.
3. **Clip `historia_rastrero`** (Fundición Cero, sótano, cámara libre): en la penumbra del sótano, un rastrero se levanta y se gira hacia la cámara.
4. **Clip `historia_entrada`** (Fundición Cero, vista del jugador, sin HUD): el jugador sale de la sala de entrada y avanza por el pasillo hacia el resplandor de la fundición.

### Textos en pantalla

- Rótulos breves y sobrios, en la esquina inferior izquierda, sincronizados con la narración:
  - «Turno de relevo: 1 técnico» (con «Ese alguien eres tú»)
  - «Forja Abisal · Estado: en funcionamiento» (con «empezó a trabajar sola»)
  - «Personal localizado: 0» (con «A los obreros no se les ha vuelto a ver»)
  - «Salida de emergencia: Núcleo Abisal» (con «La única salida está en el fondo»)

## Escena 3 — Controles y armas

**Archivo de narración:** `escena_03_controles_y_armas.wav` · **Duración orientativa:** 30 s

### Narración

> Para afrontar este reto, te mueves con el teclado, apuntas con el ratón y abres las puertas con la tecla E. Y no bajarás desarmado. El martillo de pistón golpea más fuerte si lo cargas. La pistola de servicio dispara tiros precisos o ráfagas. La escopeta de dispersión, con uno o dos cañones. La remachadora escupe remaches sin parar. Y el lanzacargas lanza cargas que estallan o rebotan. Con el botón derecho, cada arma cambia de disparo.

### Imagen

- **Primera parte (unos 7 s):** **clip `controles_recorrido`** (Fundición Cero, vista del jugador, con HUD): el jugador camina, salta, se agacha, abre una puerta con E. A la izquierda aparece la **tabla animada de controles**, fila a fila.
- **Segunda parte (unos 23 s):** cinco fichas de arma, una tras otra, cada una con su clip a la derecha y su nombre y sus dos disparos a la izquierda:
  1. **Clip `arma_martillo`**: golpe rápido y golpe cargado contra un rastrero.
  2. **Clip `arma_pistola`**: tiro preciso y ráfaga de tres contra un centinela lejano.
  3. **Clip `arma_escopeta`**: un cañón y los dos a la vez contra un rastrero que se acerca.
  4. **Clip `arma_remachadora`**: ráfaga continua y modo sobrecargado contra un vigía.
  5. **Clip `arma_lanzacargas`**: carga explosiva contra un grupo y carga rebotadora que rebota en la pared antes de estallar.
- Los clips de armas son en vista del jugador, con el arma y el HUD visibles.

### Textos en pantalla

- Tabla de controles:

  | Acción                 | Tecla             |
  | ---------------------- | ----------------- |
  | Moverse                | W A S D           |
  | Mirar y apuntar        | Ratón             |
  | Saltar / agacharse     | Espacio / C       |
  | Correr                 | Shift             |
  | Usar                   | E                 |
  | Disparar / alternativo | Clic izq. / dcho. |
  | Automapa               | Tab               |

- Fichas de armas (nombre, disparo principal → alternativo):
  1. **Martillo de pistón:** golpe rápido → golpe cargado
  2. **Pistola de servicio:** tiro preciso → ráfaga de tres
  3. **Escopeta de dispersión:** un cañón → dos cañones
  4. **Remachadora:** ráfaga continua → modo sobrecargado
  5. **Lanzacargas:** carga explosiva → carga rebotadora

## Escena 4 — Enemigos

**Archivo de narración:** `escena_04_enemigos.wav` · **Duración orientativa:** 20 s

### Narración

> Y las vas a necesitar, porque ahí abajo no estás solo. Los centinelas disparan ráfagas desde lejos. Los rastreros corren hacia ti y atacan con sus garras. Los escupidores lanzan bolas de ácido. Y los vigías flotan sobre la lava. Todos te ven, te oyen disparar y te persiguen, incluso a través de las puertas.

### Imagen

- Cuatro fichas de enemigo, unos 4 s cada una, con su clip ocupando la pantalla y un rótulo lateral. Cámara libre, a la altura de los ojos del jugador, que es invulnerable durante la grabación:
  1. **Clip `enemigo_centinela`**: un centinela se asoma tras una columna y dispara una ráfaga hacia la cámara.
  2. **Clip `enemigo_rastrero`**: un rastrero cruza la sala a toda velocidad hacia la cámara y lanza un zarpazo.
  3. **Clip `enemigo_escupidor`**: un escupidor lanza una bola de ácido que describe una parábola hacia la cámara.
  4. **Clip `enemigo_vigia`**: un vigía flota sobre el lago de lava del Núcleo Abisal, gira y dispara una descarga.
- Última frase («Todos te ven…») sobre un plano rápido de los cuatro en mosaico.

### Textos en pantalla

- Ficha de cada enemigo: nombre, salud y una línea de comportamiento:
  - **Centinela** · 60 · «Ráfagas de tres disparos a distancia»
  - **Rastrero** · 45 · «Rápido. Ataca cuerpo a cuerpo»
  - **Escupidor** · 130 · «Bolas de ácido en parábola»
  - **Vigía** · 55 · «Vuela. Descargas de energía»
- Al principio, sobre negro: «No estás solo».
- Al final: «Te ven. Te oyen. Te persiguen.»

## Escena 5 — Los tres niveles

**Archivo de narración:** `escena_05_niveles.wav` · **Duración orientativa:** 45 s

### Narración

> Para escapar tendrás que atravesar tres niveles, cada uno más hondo que el anterior, y en cada uno necesitarás las llaves roja, azul y amarilla para abrirte paso. Primero, Fundición Cero, con su canal de lava, un sótano al que se baja en ascensor y un patio abierto al cielo. Después, los Pozos de Ceniza, una sima de tres alturas con un pozo de ácido en el fondo. Y por último, el Núcleo Abisal, una caverna inundada de lava, con una torre en una isla y una armería llena de rastreros. Junto a la salida, te espera una última emboscada.

### Imagen

- Para cada nivel, unos 13 s:
  1. **Clip panorámico del nivel** (cámara libre, sin HUD): `nivel_1_panoramica` (la fundición y el patio), `nivel_2_panoramica` (la sima vista desde el anillo superior, bajando hacia el pozo de ácido) y `nivel_3_panoramica` (vuelo sobre el lago de lava hacia la torre).
  2. Encima, a un lado y semitransparente, **el plano del nivel** (`docs/planos/`): se dibuja trazo a trazo, se encienden las salas por las que pasa la narración y aparecen las llaves y la salida.
- Entre niveles, un corte con destello de fundición.

### Textos en pantalla

- Título de cada nivel: «NIVEL 1 · FUNDICIÓN CERO», «NIVEL 2 · POZOS DE CENIZA», «NIVEL 3 · NÚCLEO ABISAL».
- Datos breves de cada nivel, bajo el título:
  - Fundición Cero: «13 enemigos · Lava»
  - Pozos de Ceniza: «21 enemigos · Ácido · Cielo abierto»
  - Núcleo Abisal: «34 enemigos · Lava y ácido»
- Iconos de las tres llaves (roja, azul y amarilla) al mencionarlas.

## Escena 6 — Trucos

**Archivo de narración:** `escena_06_trucos.wav` · **Duración orientativa:** 30 s

### Narración

> Por suerte, llevas años en el oficio y conoces algunos trucos. Algunas paredes no son lo que parecen. Pulsa E sobre ellas y encontrarás pasadizos secretos, con blindaje y munición. Si un enemigo hiere a otro, se pelearán entre ellos, así que aprovéchalo. Dispara el lanzacargas al suelo justo después de saltar y llegarás más alto. Y si te pierdes, abre el automapa. Solo muestra lo que ya has explorado.

### Imagen

- Cuatro trucos, unos 7 s cada uno, con su clip a pantalla completa y un rótulo:
  1. **Clip `truco_secreto`** (Fundición Cero, vista del jugador, con HUD): el jugador se acerca a la pared sur del sótano, pulsa E, la pared sube y aparece el escondite con el blindaje.
  2. **Clip `truco_pelea`** (cámara libre): un escupidor alcanza por error a un centinela con su ácido y los dos se enfrentan.
  3. **Clip `truco_salto_carga`** (Pozos de Ceniza, vista del jugador): salto con carga desde el anillo inferior de la sima hasta el anillo superior.
  4. **Clip `truco_automapa`** (Fundición Cero, vista del jugador, con HUD): el jugador abre el automapa con Tab mientras camina; el plano se va completando.

### Textos en pantalla

- Al principio: «Trucos del oficio».
- Rótulos:
  1. «Secretos: pulsa E en las paredes sospechosas»
  2. «Deja que se peleen entre ellos»
  3. «Salto con carga: salta y dispara al suelo»
  4. «Automapa: tecla Tab»

## Escena 7 — Cierre

**Archivo de narración:** `escena_07_cierre.wav` · **Duración orientativa:** 10 s

### Narración

> La Forja Abisal te espera… Desciende, ábrete paso y sal con vida. Buena suerte, técnico. Esperamos volver a verte… a poder ser, en tu estado actual.

### Imagen

- **Clip `cierre_lago`** (Núcleo Abisal, cámara libre): la cámara se aleja despacio del lago de lava y sube hacia la oscuridad de la caverna.
- Con «La Forja Abisal te espera», el título **FORJA ABISAL** vuelve a encenderse en el centro y, debajo, aparecen los enlaces.
- Con «Buena suerte, técnico», la música se apaga y la imagen se queda casi a oscuras.
- Con «a poder ser, en tu estado actual», **último plano**: el rastrero del sótano (**clip `cierre_rastrero`**) levanta la cabeza en la penumbra y mira a cámara. Corte a negro con un golpe metálico.

### Textos en pantalla

- **FORJA ABISAL**
- «Desciende. Abre paso. Sal con vida.»
- «Juega gratis en el navegador: carte1972.github.io/forja-abisal»
- «Código fuente: github.com/Carte1972/forja-abisal»
- «Todo el contenido es original y se genera por código.»
- Ningún texto sobre el último plano del rastrero: solo la imagen y el corte a negro.

## Lista de clips

Clips que graba el modo de grabación del juego (fase 2), en el orden en que aparecen:

| Clip                  | Nivel           | Cámara  | HUD | Qué muestra                                              |
| --------------------- | --------------- | ------- | --- | -------------------------------------------------------- |
| `gancho_salto_carga`  | Núcleo Abisal   | Jugador | No  | Salto con carga sobre el lago de lava hasta la isla      |
| `historia_fundicion`  | Fundición Cero  | Libre   | No  | Travelling por la nave, del puente a la galería          |
| `historia_ronda`      | Fundición Cero  | Libre   | No  | Un centinela patrulla la galería, de espaldas            |
| `historia_rastrero`   | Fundición Cero  | Libre   | No  | Un rastrero se levanta en la penumbra del sótano         |
| `historia_entrada`    | Fundición Cero  | Jugador | No  | Del pasillo de entrada hacia la fundición                |
| `controles_recorrido` | Fundición Cero  | Jugador | Sí  | Caminar, saltar, agacharse y abrir una puerta            |
| `arma_martillo`       | Fundición Cero  | Jugador | Sí  | Golpe rápido y golpe cargado                             |
| `arma_pistola`        | Fundición Cero  | Jugador | Sí  | Tiro preciso y ráfaga de tres                            |
| `arma_escopeta`       | Fundición Cero  | Jugador | Sí  | Un cañón y dos cañones                                   |
| `arma_remachadora`    | Pozos de Ceniza | Jugador | Sí  | Ráfaga continua y modo sobrecargado                      |
| `arma_lanzacargas`    | Núcleo Abisal   | Jugador | Sí  | Carga explosiva y carga rebotadora                       |
| `enemigo_centinela`   | Fundición Cero  | Libre   | No  | Se asoma tras una columna y dispara                      |
| `enemigo_rastrero`    | Pozos de Ceniza | Libre   | No  | Carga hacia la cámara y ataca                            |
| `enemigo_escupidor`   | Pozos de Ceniza | Libre   | No  | Lanza una bola de ácido en parábola                      |
| `enemigo_vigia`       | Núcleo Abisal   | Libre   | No  | Flota sobre la lava y dispara                            |
| `nivel_1_panoramica`  | Fundición Cero  | Libre   | No  | La fundición y el patio                                  |
| `nivel_2_panoramica`  | Pozos de Ceniza | Libre   | No  | La sima, del anillo superior al pozo de ácido            |
| `nivel_3_panoramica`  | Núcleo Abisal   | Libre   | No  | Vuelo sobre el lago de lava hacia la torre               |
| `truco_secreto`       | Fundición Cero  | Jugador | Sí  | Abrir la pared secreta del sótano                        |
| `truco_pelea`         | Pozos de Ceniza | Libre   | No  | Un escupidor y un centinela se enfrentan                 |
| `truco_salto_carga`   | Pozos de Ceniza | Jugador | No  | Salto con carga del anillo inferior al superior          |
| `truco_automapa`      | Fundición Cero  | Jugador | Sí  | Automapa abierto mientras se camina                      |
| `cierre_lago`         | Núcleo Abisal   | Libre   | No  | La cámara se aleja del lago de lava                      |
| `cierre_rastrero`     | Fundición Cero  | Libre   | No  | El rastrero del sótano levanta la cabeza y mira a cámara |
