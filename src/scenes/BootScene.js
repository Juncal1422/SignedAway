import Phaser from 'phaser';

// Las rutas relativas del build conservan el punto de entrada en GitHub Pages.
const assetRoot = `${import.meta.env.BASE_URL}assets/`;
const sheets = [
  ['player', 'sprites/player.png', 16],
  ['enemies', 'sprites/enemies.png', 16],
  ['bosses', 'sprites/bosses.png', 24],
  ['projectiles', 'sprites/projectiles.png', 16],
  ['tiles', 'tilesets/gothic_dungeon_tileset.png', 16],
  ['zodiac', 'ui/icons_zodiac.png', 16],
];

// Fuente de 5×7. Cada número representa los cinco bits de una fila; el sexto
// píxel de cada celda deja espacio entre letras al componer los rótulos.
const glyphs = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 18, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14],
  2: [14, 17, 1, 2, 4, 8, 31], 3: [30, 1, 1, 14, 1, 1, 30],
  4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 16, 30, 1, 1, 30],
  6: [14, 16, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
  8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 1, 14],
  '+': [0, 4, 4, 31, 4, 4, 0], '-': [0, 0, 0, 31, 0, 0, 0],
  '/': [1, 1, 2, 4, 8, 16, 16], '.': [0, 0, 0, 0, 0, 4, 4],
  ':': [0, 4, 4, 0, 4, 4, 0], '%': [17, 2, 2, 4, 8, 8, 17],
  'Á': [2, 4, 14, 17, 31, 17, 17], 'É': [2, 4, 31, 16, 30, 16, 31],
  'Í': [2, 4, 14, 4, 4, 4, 14], 'Ó': [2, 4, 14, 17, 17, 17, 14],
  'Ú': [2, 4, 17, 17, 17, 17, 14], 'Ñ': [10, 20, 17, 25, 21, 19, 17],
};

function createPixelFont(scene) {
  const chars = Object.keys(glyphs).join('');
  const cellWidth = 6;
  const cellHeight = 8;
  const fontTexture = scene.textures.createCanvas('pixel-font', cellWidth * chars.length, cellHeight);
  const context = fontTexture.getContext();
  context.fillStyle = '#fff';
  [...chars].forEach((char, index) => {
    glyphs[char].forEach((row, y) => {
      for (let x = 0; x < 5; x++) {
        if (row & (1 << (4 - x))) context.fillRect(index * cellWidth + x, y, 1, 1);
      }
    });
  });
  fontTexture.refresh();
  const data = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: 'pixel-font', width: cellWidth, height: cellHeight, chars, charsPerRow: chars.length,
  });
  scene.cache.bitmapFont.add('pixel-font', data);
}


// Los sprites PNG se cargan una sola vez y comparten caché entre escenas.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    this.loadErrors = [];
    this.load.on('loaderror', (file) => this.loadErrors.push(file.key));
    for (const [key, path, frameSize] of sheets) {
      this.load.spritesheet(key, assetRoot + path, { frameWidth: frameSize, frameHeight: frameSize });
    }
    this.load.image('panel', assetRoot + 'ui/panel_nineslice.png');
    this.load.image('button', assetRoot + 'ui/button_nineslice.png');
  }

  create() {
    createPixelFont(this);
    if (this.loadErrors.length) {
      this.add.bitmapText(240, 136, 'pixel-font', 'ERROR AL CARGAR RECURSOS', 12).setOrigin(0.5);
      this.add.bitmapText(240, 156, 'pixel-font', this.loadErrors.join(' ').toUpperCase(), 8).setOrigin(0.5);
      return;
    }
    this.anims.create({
      key: 'walk', frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 9, repeat: -1,
    });
    const texture = this.textures.createCanvas('element-glow', 48, 48);
    const context = texture.getContext();
    const gradient = context.createRadialGradient(24, 24, 0, 24, 24, 24);
    gradient.addColorStop(0, 'rgba(255,255,255,0.65)');
    gradient.addColorStop(0.42, 'rgba(255,255,255,0.22)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 48, 48);
    texture.refresh();
    this.scene.start('menu');
  }
}
