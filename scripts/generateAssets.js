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
save('sprites/player.png', player);

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
save('sprites/enemies.png', enemies);

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
save('sprites/bosses.png', bosses);
save('ui/icons_zodiac.png', icons);

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
save('sprites/projectiles.png', projectiles);

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
save('tilesets/gothic_dungeon_tileset.png', tileset);

// NineSlice mantiene los 6 px exteriores al cambiar ancho o alto. Dibuja las
// esquinas dentro de ese margen y deja el borde medio apto para estirarse.
function makeFrame(fill, rim, inlay) {
  const frame = new PNG({ width: 24, height: 24 });
  rectangle(frame, 1, 1, 22, 22, stone.K);
  rectangle(frame, 2, 2, 20, 20, rim);
  rectangle(frame, 3, 3, 18, 18, stone.D);
  rectangle(frame, 4, 4, 16, 16, inlay);
  rectangle(frame, 5, 5, 14, 14, fill);
  for (const x of [2, 21]) {
    for (const y of [2, 21]) pixel(frame, x, y, stone.B);
  }
  for (const x of [1, 22]) {
    for (const y of [1, 22]) pixel(frame, x, y, 0, 0);
  }
  return frame;
}

save('ui/panel_nineslice.png', makeFrame(0x191720, 0x58505e, 0x39323f));
save('ui/button_nineslice.png', makeFrame(0x2a232e, 0x827083, 0x504252));
