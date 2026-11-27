import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { ELEMENTS, ZODIAC_SIGNS } from '../src/data/zodiacData.js';

// La salida depende de este archivo y de zodiacData.js. Esta ruta funciona
// incluso si se invoca el script desde fuera de la raíz del repositorio.
const assetsDirectory = fileURLToPath(new URL('../public/assets/', import.meta.url));
const overwrite = process.argv.includes('--force');

const stone = {
  '.': 0x00000000, K: 0x110f17, D: 0x211e2b, M: 0x3c3744,
  S: 0x5e5864, L: 0x848090, B: 0xb5a5ae, W: 0xf5e8de,
};

// pngjs crea un buffer RGBA inicialmente transparente. Los colores del arte
// están en RGB salvo el centinela cero, que deja el píxel transparente.
function pixel(image, x, y, rgb, opacity = 255) {
  if (!Number.isInteger(x) || !Number.isInteger(y)
    || x < 0 || y < 0 || x >= image.width || y >= image.height) {
    throw new RangeError(`Pixel (${x}, ${y}) outside ${image.width}×${image.height}`);
  }
  const index = (y * image.width + x) * 4;
  image.data[index] = (rgb >> 16) & 255;
  image.data[index + 1] = (rgb >> 8) & 255;
  image.data[index + 2] = rgb & 255;
  image.data[index + 3] = opacity;
}

function rectangle(image, left, top, width, height, rgb, opacity = 255) {
  for (let y = top; y < top + height; y++) {
    for (let x = left; x < left + width; x++) pixel(image, x, y, rgb, opacity);
  }
}

function stamp(image, left, top, rows, palette = stone) {
  rows.forEach((row, y) => {
    for (const [x, token] of [...row].entries()) {
      if (token === '.') continue;
      if (!Object.hasOwn(palette, token)) throw new Error(`Unknown palette token: ${token}`);
      pixel(image, left + x, top + y, palette[token]);
    }
  });
}

function save(relativePath, image) {
  const path = resolve(assetsDirectory, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  try {
    // El modo exclusivo conserva los retoques manuales aunque se relance el
    // generador. --force permite restaurar deliberadamente el arte original.
    writeFileSync(path, PNG.sync.write(image), { flag: overwrite ? 'w' : 'wx' });
    console.log(`Generated ${relativePath} (${image.width}×${image.height})`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log(`Kept ${relativePath}`);
  }
}

// Las siluetas de referencia fijan las proporciones. El atlas final añade
// bordes, insignias y detalles a un píxel en celdas nativas de 32×32.
function copyFrame(source, target, sourceX, sourceY, sourceSize, targetX, targetY, size, offset = () => 0) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = targetX + x + offset(y);
      if (px < targetX || px >= targetX + size) continue;
      const index = ((sourceY + Math.floor(y * sourceSize / size)) * source.width
        + sourceX + Math.floor(x * sourceSize / size)) * 4;
      const [r, g, b, alpha] = source.data.subarray(index, index + 4);
      if (alpha) pixel(target, px, targetY + y, (r << 16) | (g << 8) | b, alpha);
    }
  }
}

function resizeAtlas(source, size, decorate = () => {}) {
  const columns = source.width / size;
  const rows = source.height / size;
  const result = new PNG({ width: columns * 32, height: rows * 32 });
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = column * 32;
      const y = row * 32;
      copyFrame(source, result, column * size, row * size, size, x, y, 32);
      decorate(result, x, y, column, row);
    }
  }
  return result;
}

// Jugador, cuatro frames de 16×16. Mueve los pies y la capa para crear un
// ciclo básico. El código de animación podrá leerlos de izquierda a derecha.
const player = new PNG({ width: 64, height: 16 });
const cloak = [
  '......KKKK......', '.....KSSSMK.....', '....KSLMSSMK....',
  '....KSMDDMSK....', '....KSDWDDSK....', '....KSDDDDMK....',
  '.....KMMMMK.....', '...KKMSSSMKKK...', '..KSDMBBMMDMSK..',
  '..KSDKMSSMKDSK..', '...KKMDMMMDKK...',
];
const walkCycle = [
  ['....KMSMSMMK....', '...KDDMDDMDK....', '...KKKKKKKKK....', '.....KK..KK.....'],
  ['....KMSMSMMK....', '....KDMDMDDK....', '....KKKKKKKK....', '.....KK...KK....'],
  ['....KMSMSMMK....', '....KDDMDDMDK...', '....KKKKKKKKK...', '.....KK..KK.....'],
  ['...KMMSMSMK.....', '...KDMDDDMK.....', '...KKKKKKKK.....', '....KK...KK.....'],
];
walkCycle.forEach((feet, frame) => stamp(player, frame * 16, 1, [...cloak, ...feet]));


// Enemigos de 16×16: espectro cuerpo a cuerpo, ballestero y custodio elemental.
// La fila sigue el orden Fuego, Tierra, Aire, Agua. La columna es el arquetipo.
const enemySilhouettes = [
  ['.....KKKKKK.....', '....KSSMMSMK....', '...KSLMMSSMMK...', '...KSDWDDWSMK...',
    '...KMDKDDKDMK...', '..KKMDDDDDMKK...', '.KSDKMDDMKDSMK..', '.KSDKMSSMKDSMK..',
    '..KKMMSSMMKK....', '....KDDDDK......', '...KDK..KDK.....', '...KK....KK.....'],
  ['......KKKK......', '.....KMMMSK.....', '....KMSLSMMK....', '....KDDWDDDK....',
    '.....KMMMMK.....', '....KSMMMSMK....', '..KBKDDDDDKBK...', '.KDMBBBSBBBMDK..',
    '..KKKMSMSMKKK...', '....KDMDDDK.....', '....KDK.KDK.....', '....KK...KK.....'],
  ['.......KK.......', '....K.KBBK.K....', '...KSKBWWBKSK...', '..KMSKBBBBKSMK..',
    '..KDMSMBBMSMDK..', '...KDSSLSSDK....', '..KMSMDDMSSMK...', '...KDSMMSSDK....',
    '..KDMDDMDDMDK...', '...KKMDDMKK.....', '.....KMMK.......', '......KK........'],
];
const elementalColors = Object.values(ELEMENTS).map((element) => element.color);
const enemies = new PNG({ width: 48, height: 64 });
elementalColors.forEach((color, row) => {
  enemySilhouettes.forEach((silhouette, column) => {
    stamp(enemies, column * 16, row * 16 + 2, silhouette, { ...stone, W: color });
  });
});
save('sprites/enemies.png', resizeAtlas(enemies, 16, (atlas, x, y, column, row) => {
  const color = elementalColors[row];
  const edge = 0xd3bfab;
  if (column === 0) {
    stamp(atlas, x + 2, y + 11, ['X....', 'XX...', 'XXX..', '.XXX.', '..X..', '..X..'], { X: edge });
    stamp(atlas, x + 24, y + 11, ['....X', '...XX', '..XXX', '.XXX.', '..X..', '..X..'], { X: edge });
    rectangle(atlas, x + 9, y + 20, 14, 2, color);
  } else if (column === 1) {
    rectangle(atlas, x + 3, y + 6, 2, 7, edge);
    rectangle(atlas, x + 4, y + 12, 17, 2, edge);
    rectangle(atlas, x + 4, y + 10, 12, 1, color);
  } else {
    stamp(atlas, x + 12, y + 2, ['...XX...', '..X..X..', '.X.XX.X.', '..X..X..', '...XX...'], { X: color });
    rectangle(atlas, x + 13, y + 16, 6, 2, color);
  }
}));

// Glifos originales de 9×9. Cada posición coincide con ZODIAC_SIGNS.
const sigils = [
  ['.##...##.', '#..#.#..#', '#..###..#', '...###...', '....#....', '....#....', '....#....', '.........', '.........'],
  ['#.......#', '.#.....#.', '..#####..', '.#.....#.', '.#.....#.', '.#.....#.', '..#####..', '.........', '.........'],
  ['.#######.', '...#.#...', '...#.#...', '...#.#...', '...#.#...', '...#.#...', '.#######.', '.........', '.........'],
  ['..#####..', '.#.......', '###......', '#.#..###.', '###..#.#.', '.......#.', '..#####..', '.........', '.........'],
  ['..###....', '.#...#...', '###..#...', '#.#..#...', '###..#..#', '.....#..#', '......##.', '.........', '.........'],
  ['.#.#.#...', '.##.##...', '.#.#.#.#.', '.#.#.##.#', '.#.#.#.#.', '.....##..', '....#....', '.........', '.........'],
  ['...###...', '..#...#..', '..#...#..', '##.....##', '.........', '.#######.', '.........', '.........', '.........'],
  ['.#.#.#...', '.##.##...', '.#.#.#...', '.#.#.#...', '.#.#.#...', '.....#..#', '......##.', '.......##', '.........'],
  ['....#####', '......#.#', '.....#..#', '..#.#....', '...#.....', '..#.#....', '.#.......', '.........', '.........'],
  ['#..#.....', '#.#.#....', '.#..#....', '....#....', '....#..#.', '....#.###', '.....###.', '.........', '.........'],
  ['.#..#..#.', '#.##.##.#', '.........', '.#..#..#.', '#.##.##.#', '.........', '.........', '.........', '.........'],
  ['.#.....#.', '..#...#..', '...#.#...', '.#######.', '...#.#...', '..#...#..', '.#.....#.', '.........', '.........'],
];

// Los iconos caben en un marco de 16×16. La placa permite teñirlos o dibujarlos
// sobre fondos claros. Los jefes repiten su sigilo como emblema visible.
const icons = new PNG({ width: 16 * 12, height: 16 });
const bosses = new PNG({ width: 24 * 12, height: 24 });
const bossArmor = [
  '.........KKKKKK.........', '.......KKSSSSSSKK.......', '......KSSSMMMMSSSK......',
  '.....KSSMDDDDDDMSSK.....', '.....KSMDDWDDWDDMSK.....', '......KKMMMMMMKK......',
  '....KKSSMMMMMMMMSSKK....', '...KSSSDDDDDDDDDDSSSK...', '..KSSSMDMMMMMMMMDMSSSK..',
  '.KKSSMDMDDDDDDDDMDMSSKK.', '.KSMSMDMDDDDDDDDMDMSMSK.', '.KMKSMMDMDDDDDDMDMMSKMK.',
  '.KKKMMMDMDDDDDDMDMMMKKK.', '....KMMMDMDDDDMDMMMK....', '...KSMMMSMMDDMMSMMMSK...',
  '...KMMSSMMMMMMMMSSMMK...', '..KSMMMKSSMMMMSSKMMMSK..', '..KMMK.KMMSMMMSK.KMMK..',
  '..KKK..KMMKKMMK..KKK...', '......KMMK..KMMK.......', '......KKK....KKK.......',
];
ZODIAC_SIGNS.forEach((sign, frame) => {
  const color = ELEMENTS[sign.element].color;
  const iconLeft = frame * 16;
  rectangle(icons, iconLeft + 1, 1, 14, 14, stone.K);
  rectangle(icons, iconLeft + 2, 2, 12, 12, stone.S);
  rectangle(icons, iconLeft + 3, 3, 10, 10, stone.D);
  stamp(icons, iconLeft + 4, 4, sigils[frame], { '#': color });

  const bossLeft = frame * 24;
  stamp(bosses, bossLeft, 3, bossArmor, { ...stone, W: color });
  // La segunda capa de la silueta distingue las tres modalidades.
  const crowns = {
    cardinal: ['.##...##.', '..#...#..', '..#####..'],
    fixed: ['#.#.#.#.#', '#########', '.#######.'],
    mutable: ['....#....', '..#####..', '#.#####.#'],
  };
  stamp(bosses, bossLeft + 8, 1, crowns[sign.modality], { '#': stone.L });
  stamp(bosses, bossLeft + 8, 11, sigils[frame], { '#': color });
});
save('sprites/bosses.png', resizeAtlas(bosses, 24, (atlas, x, y, column) => {
  const color = ELEMENTS[ZODIAC_SIGNS[column].element].color;
  rectangle(atlas, x + 4, y + 14, 4, 1, color);
  rectangle(atlas, x + 24, y + 14, 4, 1, color);
}));
save('ui/icons_zodiac.png', resizeAtlas(icons, 16));

const poses = 12;
const animatedPlayer = new PNG({ width: poses * 32, height: 32 * ZODIAC_SIGNS.length });
ZODIAC_SIGNS.forEach((sign, row) => {
  const color = ELEMENTS[sign.element].color;
  for (let pose = 0; pose < poses; pose++) {
    const x = pose * 32;
    const y = row * 32;
    const attacking = pose >= 4 && pose <= 6;
    const dashing = pose >= 7 && pose <= 9;
    const hurt = pose >= 10;
    const lean = dashing ? (line) => Math.round((17 - line) / 4)
      : attacking ? (line) => Math.round((15 - line) / 8) : () => 0;
    copyFrame(player, animatedPlayer, (pose % 4) * 16, 0, 16, x, y, 32, lean);
    stamp(animatedPlayer, x + 12, y + 15, sigils[row], { '#': hurt ? 0xffa29d : color });
    if (attacking) {
      const reach = pose - 4;
      rectangle(animatedPlayer, x + 24, y + 14 - reach * 3, 5 + reach, 2, color);
      rectangle(animatedPlayer, x + 27, y + 13 - reach * 3, 2, 4, stone.W);
    }
    if (dashing) {
      rectangle(animatedPlayer, x + 1, y + 17 + pose % 3, 11 - pose % 3 * 2, 1, color, 185);
      rectangle(animatedPlayer, x + 3, y + 23, 9, 2, color, 95);
    }
    if (hurt) stamp(animatedPlayer, x + 19, y + 4, ['...X..', '.XX.XX', '...X..', '..X.X.'], { X: 0xffa48c });
  }
});
save('sprites/player.png', animatedPlayer);

// Cuatro formas de proyectil por elemento: aguja, orbe, filo y chispa.
// La opacidad de la segunda capa deja un borde luminoso listo para componer.
const projectileShapes = [
  ['.........#..', '....########', '###########.', '....########', '.........#..'],
  ['....####....', '..########..', '.##########.', '.##########.', '..########..', '....####....'],
  ['........###.', '.....#####..', '...#####....', '.#######....', '#####.......'],
  ['.....##.....', '..#..##..#..', '...######...', '.##########.', '...######...', '..#..##..#..', '.....##.....'],
];
const projectiles = new PNG({ width: 64, height: 64 });
elementalColors.forEach((color, row) => {
  projectileShapes.forEach((shape, column) => {
    const left = column * 16 + 2;
    const top = row * 16 + 5;
    shape.forEach((line, y) => {
      [...line].forEach((token, x) => {
        if (token === '.') return;
        pixel(projectiles, left + x, top + y - 1, color, 95);
        pixel(projectiles, left + x, top + y + 1, color, 95);
      });
    });
    stamp(projectiles, left, top, shape, { '#': color });
    rectangle(projectiles, left + 5, top + 2, 2, 1, stone.W);
  });
});
const projectileAtlas = new PNG({ width: 4 * 32, height: 7 * 32 });
const enemyShots = resizeAtlas(projectiles, 16);
PNG.bitblt(enemyShots, projectileAtlas, 0, 0, enemyShots.width, enemyShots.height, 0, 0);

// Doce siluetas de hechizo: tizón, escudo, filo, ola, llama, guardián,
// bumerán, aguja, cometa, sello, órbita y espejo.
const shapes = [
  ['.......OO..', '...OOOOWWO.', '.OOOOWWWWOO', '.....OOOOO.', '..OO.......'],
  ['...OOOOO...', '..OWWWWWO..', '..OW...WO..', '...OW.WO...', '....OWO....'],
  ['.........W.', '......OWWO.', '...OWWWOO..', '.OWOO......', 'OO.........'],
  ['...OOO..O..', '..OWWWOOO..', '.OWOOOWWO..', 'OOO.....O..'],
  ['.......O...', '....OOOWO..', '..OOWWWOWO.', '...OOOWWWOO', '......OOOO.'],
  ['.....W.....', '...OWWWO...', '....OWO....', '....OWO....', '..OOOOOOO..'],
  ['OO......OO.', '.WO....OW..', '..WO..OW...', '...OWWO....', '....OO.....'],
  ['..........W', '...OWWWWWWO', 'OOOWWWWWWO.', '...OOOO....'],
  ['......OO...', '...OOOWWWO.', '.OOOWWWWWWO', '...OWWWWWO.', '.....OOO...'],
  ['.....O.....', '...OOWOO...', '..OWOWOWO..', '...OOWOO...', '.....O.....'],
  ['....OOO....', '..OO...OO..', '..OW.W.WO..', '..OO...OO..', '....OOO....'],
  ['....OWO....', '..OWWOOWO..', '..OW...WO..', '..OWOOWWO..', '....OWO....'],
];
ZODIAC_SIGNS.forEach((sign, index) => {
  const shape = new PNG({ width: 16, height: 16 });
  const color = ELEMENTS[sign.element].color;
  stamp(shape, 2, 5, shapes[index], { O: color, W: stone.W });
  const x = index % 4 * 32;
  const y = (4 + Math.floor(index / 4)) * 32;
  copyFrame(shape, projectileAtlas, 0, 0, 16, x, y, 32);
  rectangle(projectileAtlas, x + 2, y + 16, 3, 1, color, 140);
});
save('sprites/projectiles.png', projectileAtlas);

// El tileset es monocromo para admitir tintes. Frame 0: suelo. 1: losas.
// 2: muro. 3: grieta. 4: altar. 5: arco. 6: escombro. 7: pavimento ritual.
// La textura usa una función entera y determinista para repetir el mismo PNG.
const tileset = new PNG({ width: 128, height: 16 });
for (let tile = 0; tile < 8; tile++) {
  const left = tile * 16;
  rectangle(tileset, left, 0, 16, 16, 0x27252d);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const stoneGrain = (x * 59 + y * 37 + x * y * 13 + tile * 17) % 19;
      if (stoneGrain < 4) pixel(tileset, left + x, y, 0x322f38);
      if (stoneGrain === 7) pixel(tileset, left + x, y, 0x201e26);
    }
  }
  if (tile <= 1) {
    rectangle(tileset, left, 15, 16, 1, stone.K);
    rectangle(tileset, left + 15, 0, 1, 16, stone.K);
    rectangle(tileset, left + 1, 1, 12, 1, 0x35323b);
  }
}
stamp(tileset, 32, 0, [
  'SSSSSSSSSSSSSSSS', 'SMMMMMMDSMMSMMMD', 'SMMSMMMDSMMMMMMD', 'DDDDDDDDDDDDDDDD',
  'MDSMSSMMSMMSMDMS', 'MDSMMMMMMMMMMDMM', 'DDDDDDDDDDDDDDDD', 'SMMSMMDSMSSMMMMD',
  'SMMMMMDSMMMMMMMD', 'DDDDDDDDDDDDDDDD', 'MDSMMMSMMMDSMMMM', 'MDSMMMMMMMDSMMMM',
  'DDDDDDDDDDDDDDDD', 'MMMMDSMSSMMMMMMD', 'MMMMDSMMMMMMMMMD', 'KKKKKKKKKKKKKKKK',
]);
stamp(tileset, 49, 2, [
  'KK............', '.K............', '..KK..........', '....K.........', '.....KKKK.....',
  '.....K...KK...', '....K......K..', '...K........K.', '..K..........K', '.KK...........',
  'K..K..........', '....K.........',
]);
stamp(tileset, 66, 2, [
  '...KBBBBK...', '..KSLLLLSK..', '..SLSSSSLS..', '..SMMBBMMS..', '..SSSKKSSS..',
  '...KSSSSK...', '...KSMMSK...', '...KSMMSK...', '..KSMMMMSK..',
  '.KSSSSSSSSK.', '.KMMMMMMMMK.', 'KKKKKKKKKKKK',
]);
stamp(tileset, 80, 1, [
  '....SSSSSSSS....', '..SSLMMMMMLSS...', '.SLMSMMMMMSMLS..', '.SMSSDDSDSMMS..',
  'SMMMDKKKKKDMMS.', 'SMMDKKKKKKKDMMS', 'SMMDKKKKKKKDMMS', 'SMMDKKKKKKKDMMS',
  'SMMDKKKKKKKDMMS', 'SMMDKKKKKKKDMMS', 'SMMDKKKKKKKDMMS', 'SMMDKKKKKKKDMMS',
  'SMMDDDDDDDDDMMS', 'KKKKKKKKKKKKKKK',
]);
stamp(tileset, 97, 6, ['...MSMM........', '..MSMMMK.MMS...', '.....KKK.DMMK..',
  '.SSM.....KKK...', '.DMK..MSS..SMM.', '..KK..DDK..DMK.']);
stamp(tileset, 114, 2, [
  '....MMMM....', '..MM....MM..', '.M...SS...M.', '.M..S..S..M.', 'M..S....S..M',
  'M.S..BB..S.M', 'M.S..BB..S.M', 'M..S....S..M', '.M..S..S..M.', '.M...SS...M.',
  '..MM....MM..', '....MMMM....',
]);
save('tilesets/gothic_dungeon_tileset.png', resizeAtlas(tileset, 16, (atlas, x, y, frame) => {
  if (frame !== 2) return;
  rectangle(atlas, x, y, 32, 2, 0xb4abae);
  rectangle(atlas, x, y, 2, 29, 0x8d8289);
  rectangle(atlas, x + 30, y + 2, 2, 27, 0x493d49);
  rectangle(atlas, x, y + 29, 32, 3, 0x110d16);
  for (let row = 5; row < 27; row += 7) {
    rectangle(atlas, x + 3, y + row, 26, 1, 0x8d7883);
    rectangle(atlas, x + 6 + (row % 11), y + row + 1, 12, 1, 0x777078);
  }
}));

// NineSlice mantiene los 6 px exteriores al cambiar ancho o alto. Dibuja las
// esquinas dentro de ese margen y deja el borde medio apto para estirarse.
function makeFrame(fill, rim, inlay) {
  const frame = new PNG({ width: 32, height: 32 });
  rectangle(frame, 1, 1, 30, 30, stone.K);
  rectangle(frame, 2, 2, 28, 28, rim);
  rectangle(frame, 3, 3, 26, 26, stone.D);
  rectangle(frame, 4, 4, 24, 24, inlay);
  rectangle(frame, 5, 5, 22, 22, fill);
  for (const x of [2, 29]) {
    for (const y of [2, 29]) pixel(frame, x, y, stone.B);
  }
  for (const x of [1, 30]) {
    for (const y of [1, 30]) pixel(frame, x, y, 0, 0);
  }
  return frame;
}

save('ui/panel_nineslice.png', makeFrame(0x191720, 0x58505e, 0x39323f));
save('ui/button_nineslice.png', makeFrame(0x2a232e, 0x827083, 0x504252));
