# Signed Away

Roguelite de acción cenital de estética gótica. Cada partida empieza con un
signo del zodíaco. Al morir, se elige otro signo y el cruce determina el
las afinidades y las estadísticas del siguiente personaje del linaje.

## Arranque y revisión

Usa Node.js 20.19+ en la rama 20 o Node.js 22.12+.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

El juego arranca en el título. Usa WASD o flechas para moverte, espacio
para esquivar, y mantén pulsado el ratón o J para lanzar. Sagitario carga
su hechizo mientras mantienes pulsado el botón. Abre la pausa con Esc.
Cada expedición tiene exactamente cuatro pisos. Una afinidad avanzada puede
sustituir uno de los biomas de su familia. Cada sala de combate despejada da
experiencia, cura una pequeña parte de la vida y acerca a romper el sello
del jefe. Las mejoras se eligen al subir de nivel y duran esa expedición.
Abre la ficha con Tab para consultar atributos, poderes y mejoras. Al elegir
descendiente, la pestaña Cálculo explica la mezcla y el rango de tirada.

Los catálogos del menú explican hechizos, aspectos, afinidades, bonificadores,
enemigos y jefes. El historial incluye los signos, poderes, elementos y
encuentros. Volver a primera generación archiva la saga y reinicia sus
desbloqueos y afinidades. El guardado de la versión anterior
conserva sus generaciones, jefes y afinidades. El progreso dentro de una expedición pertenece a la sesión
activa. Al volver a abrir el juego puedes iniciar otra expedición a partir
del ascendiente guardado. Si abres el juego desde un lanzador, conserva
la URL de publicación para mantener el mismo origen del guardado.

## Lanzador portátil y build web

Abre `SignedAway.html` con doble clic. Puedes descargar solo ese HTML
para probar el build de `main` desde GitHub. El lanzador carga el
paquete de GitHub Raw por el SHA de la rama y funciona sin GitHub Pages.
Si GitHub no responde, una copia completa del repositorio puede usar
`launcher/signed-away.js` sin conexión. Abrir el `index.html` de la raíz
por `file://` lleva al mismo lanzador.

```sh
npm ci
npm run build:launcher
```

Versiona `launcher/signed-away.js` junto con cada cambio del juego o de
los PNG para que el lanzador descargado sirva esa versión. El comando
empaqueta Phaser, los módulos y los PNG en un único script clásico
comprimido. Mantén la ruta y el formato del paquete para que
`SignedAway.html` siga sirviendo al cambiar archivos o escenas.
Los navegadores actuales pueden leerlo con su descompresor integrado.

Para servir la aplicación por HTTP, usa `npm run dev` en desarrollo o
publica el contenido de `dist/` después de `npm run build`. El build
web conserva `base: './'` para alojarlo bajo `/SignedAway/` u otra subruta.
Los guardados de la versión servida por HTTP y el lanzador local pueden
pertenecer a almacenamientos distintos según el navegador y la ruta.

`index.html` monta el juego sobre fondo negro. Phaser dibuja los paneles,
botones, textos, barras y menús dentro del canvas. Usa NineSlice para
marcos y botones en WebGL y tipografía bitmap para los rótulos. Mantén
`pixelArt` y el filtrado por píxel. La piedra y la interfaz usan tonos
apagados. Reserva los colores saturados para los elementos, la magia
y las señales de combate.

## Datos de diseño

- `src/data/zodiacData.js` declara los cuatro elementos y los doce signos
  con estadísticas base y un patrón de hechizo propio por signo. Ajusta
  allí la vida, velocidad, cadencia, daño y parámetros de patrón. Aries,
  Cáncer, Libra y Capricornio son los signos cardinales iniciales.
- `src/data/astrologyTable.js` construye la matriz de cruces a partir de la
  distancia en la rueda. Los aspectos controlan el peso del padre, los
  multiplicadores de daño y cadencia y la amplitud de cada tirada.
  `predictInheritance` calcula centros e intervalos. `rollInheritance`
  tira una vez por campo, con RNG inyectable para comprobaciones.
  Mantén las reglas independientes de Phaser y del guardado.
- `elementalPowers.js` contiene seis recetas básicas y doce avanzadas.
  El quincuncio impide una nueva fusión y la oposición permite solo fusiones
  básicas. La herencia consulta primero las afinidades más recientes que
  tengan una combinación válida. Cada poder nuevo se suma a los anteriores y
  conserva el hechizo que ya usaba el linaje. Tiempo ralentiza todo el combate
  enemigo y Miasma inflige daño al entrar.
- `spellModifiers.js` define efectos acumulables y límites por mejora.
  `enemiesData.js` separa stats, arquetipos y secuencias de los jefes de
  su comportamiento. Las salas de jefe eligen uno de los tres signos del
  elemento. Cada uno tiene patrones propios y ritmos de movimiento
  diferenciados. Los pisos híbridos pueden tener su propia selección.
- Usa identificadores estables en inglés para signos, elementos y
  hechizos. Los nombres visibles pueden traducirse sin alterar los datos
  de guardado. Respeta el orden de la rueda para conservar la correspondencia
  entre los aspectos y los índices de los PNG.

## Editar o ampliar los PNG

Los PNG son RGBA y están incluidos en el repositorio. Usa
`npm run generate-assets` para recrear archivos que falten. Por defecto
conserva todos los archivos existentes. Usa
`npm run generate-assets -- --force` para restaurar todo el arte generado.
Los cambios directos en los PNG se pueden versionar. Si quieres que
sobrevivan también a una regeneración explícita, refleja el cambio en las
matrices o en la paleta del generador.

| Archivo en `public/assets/` | Disposición |
| --- | --- |
| `sprites/player.png` | 32 poses de 32×32 por signo: reposo 0–5, carrera 6–15, ataque 16–22, dash 23–27 y daño 28–31 |
| `sprites/enemies.png` | Ocho poses de 32×32 por variante. Filas en orden de bioma y arquetipo |
| `sprites/bosses.png` | Ocho poses de 32×32 por jefe, filas en orden zodiacal |
| `sprites/projectiles.png` | Cuatro fases de 32×32 por fila. 16 perfiles hostiles y 12 zodiacales |
| `tilesets/gothic_dungeon_tileset.png` | Diez tiles de 32×32 por bioma. Suelos 0–1, muro 2, grieta 3, altar 4, arco 5, escombro 6, pavimento ritual 7 y terreno animado 8–9 |
| `ui/panel_nineslice.png`, `ui/button_nineslice.png` | Marcos de 32×32 con márgenes de 6 px |
| `ui/icons_zodiac.png` | Doce frames de 32×32 en orden zodiacal |

Las filas por elemento siguen el orden Fuego, Tierra, Aire, Agua.
Conserva la cuadrícula de frames al editar. Si añades un recurso,
actualiza su carga en la escena de arranque y documenta sus dimensiones
y orden. Trabaja con píxeles enteros y sin suavizado.

## Arquitectura

- `src/main.js` configura Phaser y registra las escenas. `BootScene`
  carga los PNG y crea la fuente de píxeles compartida.
- `MenuScene` y `ZodiacSelectScene` gestionan título, selección y tiradas.
  `GameScene` orquesta la expedición. `UIScene` dibuja el HUD,
  el minimapa, la ficha, las mejoras de nivel y los diálogos.
- `SaveSystem` centraliza la lectura y escritura de `localStorage`.
  `GeneticSystem` aplica las reglas de `astrologyTable.js` y calcula la
  ruta de pisos según el signo y las zonas desbloqueadas.
- `MapGenerator` conecta salas y separa los datos de colisión de los
  sprites. Cada sala conserva una semilla de decoración durante la
  expedición. Cada bioma tiene suelo, obstáculos y terreno propios. El tinte combina afinidad, tiempo y distancia al jugador.
- `Player`, `Projectile`, `Enemy` y `Boss` actualizan las entidades.
  `GameScene` limita el paso temporal a 30 ms. El dash y los intervalos de
  ataque usan ese reloj. Los avisos de ataque y las trampas dejan de avanzar
  en pausa. Los proyectiles vigentes se limpian al cambiar de sala.

Usa módulos ES y nombres descriptivos en inglés. Documenta fórmulas,
unidades, convenciones de frames y puntos de ajuste junto a la definición
que los controla.
