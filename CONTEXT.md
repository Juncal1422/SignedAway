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

La fase 1 arranca en una vista de comprobación de Phaser. Los cuatro
botones permiten ver los tintes, proyectiles y cruces de ejemplo.
Los cuatro iconos cardinales aparecen iluminados para mostrar el estado
inicial previsto. La vista no guarda partida.

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
  Esos identificadores permitirán desbloquear pisos en su fase.
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

## Fases y responsabilidades

1. Cimientos, generador de PNG y datos astrológicos. `src/main.js` configura
   Phaser y aloja la vista provisional de comprobación.
2. `data/` incorporará enemigos y modificadores. `systems/` incorporará
   persistencia y aplicación de las reglas al linaje.
3. `MapGenerator.js` generará salas, conexiones, colisiones y tintes.
4. `entities/` implementará movimiento, dash, proyectiles, enemigos y jefes.
5. `scenes/` separará carga, menú, selección zodiacal, juego y HUD. Sustituye
   entonces la vista provisional y conserva el punto de entrada público.

Requiere revisión del desarrollador para pasar de una fase a la
siguiente. Usa módulos ES y nombres descriptivos en inglés. Documenta
en el código las fórmulas, unidades, convenciones de frames y puntos
de ajuste, junto a la definición que realmente los controla.
