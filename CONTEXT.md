# Signed Away

Roguelite de acción cenital de estética gótica. Cada partida empieza con un
signo del zodíaco. Al morir, se elige otro signo y el cruce determina el
hechizo y las estadísticas del siguiente personaje del linaje.

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
Entra por los arcos, despeja salas, elige mejoras y vence al jefe que marca
el minimapa. Si caes, selecciona el signo de tu descendiente para ver la
predicción y confirma para revelar su tirada antes de entrar.

El navegador guarda desbloqueos, el historial de linaje y el último
ascendiente. El progreso dentro de una expedición pertenece a la sesión
activa. Al volver a abrir el juego puedes iniciar otra expedición a partir
del ascendiente guardado. Si abres el juego desde un lanzador, conserva
la URL de publicación para mantener el mismo origen del guardado.

## Contrato del lanzador

El punto de entrada público es el **`index.html` compilado**. Publica el
contenido de `dist/` completo bajo una URL estable como
`https://juncal1422.github.io/SignedAway/`. Configura `SignedAway.html`
para abrir esa URL. Conserva la URL al publicar cambios para que el
lanzador sea independiente de los nombres del bundle, los módulos o los
recursos. El proyecto está preparado con `base: './'`. El repositorio y
la publicación del build son pasos distintos.

`index.html` solo monta el juego sobre fondo negro. Renderiza todos los
paneles, botones, textos, barras y menús dentro de Phaser. Usa NineSlice
para marcos y botones en WebGL y tipografía bitmap para los rótulos.
Mantén `pixelArt` y el filtrado por píxel. La piedra y la interfaz usan
tonos apagados. Reserva los colores saturados para los elementos, la
magia y las señales de combate.

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
- El signo elegido aporta el patrón del hechizo y su elemento principal.
  El signo del padre aporta parte de las estadísticas y su afinidad.
  Un cruce Fuego–Tierra produce Magma y uno Agua–Aire produce Tormenta.
  Dichos cruces abren pisos que se añaden al final de la ruta. Magma
  añade daño y quemadura a los impactos. Tormenta ralentiza y encadena.
- `spellModifiers.js` define efectos acumulables y límites por mejora.
  `enemiesData.js` separa stats, arquetipos y secuencias de los jefes de
  su comportamiento. Las salas de jefe eligen uno de los tres signos del
  elemento. Los pisos híbridos tienen sus propias combinaciones.
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
| `sprites/player.png` | Cuatro frames de 16×16 para una animación de pasos |
| `sprites/enemies.png` | Frames de 16×16. Tres columnas por arquetipo y cuatro filas por elemento |
| `sprites/bosses.png` | Doce frames de 24×24 en orden zodiacal |
| `sprites/projectiles.png` | Frames de 16×16. Cuatro formas por fila y cuatro filas por elemento |
| `tilesets/gothic_dungeon_tileset.png` | Ocho tiles de 16×16. Suelos 0–1, muro 2, grieta 3, altar 4, arco 5, escombro 6 y pavimento ritual 7 |
| `ui/panel_nineslice.png`, `ui/button_nineslice.png` | Marcos de 24×24 con márgenes de 6 px |
| `ui/icons_zodiac.png` | Doce frames de 16×16 en orden zodiacal |

Las filas por elemento siguen el orden Fuego, Tierra, Aire, Agua.
Conserva la cuadrícula de frames al editar. Si añades un recurso,
actualiza su carga en la escena de arranque y documenta sus dimensiones
y orden. Trabaja con píxeles enteros y sin suavizado.

## Arquitectura

- `src/main.js` configura Phaser y registra las escenas. `BootScene`
  carga los PNG y crea la fuente de píxeles compartida.
- `MenuScene` y `ZodiacSelectScene` gestionan título, selección y tiradas.
  `GameScene` orquesta la expedición. `UIScene` dibuja el HUD,
  el minimapa, las recompensas y los diálogos.
- `SaveSystem` centraliza la lectura y escritura de `localStorage`.
  `GeneticSystem` aplica las reglas de `astrologyTable.js` y calcula la
  ruta de pisos según el signo y las zonas desbloqueadas.
- `MapGenerator` conecta salas y separa los datos de colisión de los
  sprites. Cada sala conserva una semilla de decoración durante la
  expedición. El tinte combina afinidad, tiempo y distancia al jugador.
- `Player`, `Projectile`, `Enemy` y `Boss` actualizan las entidades.
  `GameScene` limita el paso temporal a 30 ms. El dash y los intervalos de
  ataque usan ese reloj. Los avisos de ataque y las trampas dejan de avanzar
  en pausa. Los proyectiles vigentes se limpian al cambiar de sala.

Usa módulos ES y nombres descriptivos en inglés. Documenta fórmulas,
unidades, convenciones de frames y puntos de ajuste junto a la definición
que los controla.
