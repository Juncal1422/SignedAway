import Phaser from 'phaser';
import { ELEMENTS, STARTER_SIGN_IDS, ZODIAC_BY_ID, ZODIAC_SIGNS } from './data/zodiacData.js';
import { predictInheritance } from './data/astrologyTable.js';

const gameWidth = 480;
const gameHeight = 288;

// Vite entrega "./" también en el build. El navegador resuelve las peticiones
// respecto a index.html para que el mismo dist funcione en un subdirectorio.
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
  '1': [4, 12, 4, 4, 4, 4, 14], '+': [0, 4, 4, 31, 4, 4, 0],
};

function createPreviewFont(scene) {
  const chars = Object.keys(glyphs).join('');
  const cellWidth = 6;
  const cellHeight = 8;
  const fontTexture = scene.textures.createCanvas('preview-font', cellWidth * chars.length, cellHeight);
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
    image: 'preview-font', width: cellWidth, height: cellHeight, chars, charsPerRow: chars.length,
  });
  scene.cache.bitmapFont.add('preview-font', data);
}

// Esta escena provisional verifica el arranque de Fase 1. Las escenas de
// selección, combate, progresión y HUD llegarán en sus fases correspondientes.
class FoundationPreview extends Phaser.Scene {
  constructor() {
    super('foundation-preview');
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
    createPreviewFont(this);
    this.label(gameWidth / 2, 29, 'SIGNED AWAY', 24, 0xefe1d7);
    this.label(gameWidth / 2, 52, 'FASE 1', 8, 0xa698a6);
    if (this.loadErrors.length) {
      this.label(gameWidth / 2, 145, 'ERROR AL CARGAR RECURSOS', 8, 0xff623e);
      return;
    }

    this.floorTiles = this.drawRoom();
    this.drawZodiacPanel();
    this.drawElementButtons();

    // Recorre un segmento para verificar la lectura de frames y el brillo.
    // No usa físicas: cada futuro proyectil tendrá su propia lógica de entidad.
    this.tweens.add({
      targets: [this.spell, this.glow],
      x: 263,
      duration: 1300,
      repeat: -1,
      onUpdate: () => { this.glow.alpha = this.spell.x >= 255 ? 0.38 : 0.9; },
    });
    this.previewElement(0);
  }

  label(x, y, value, size = 8, tint = 0xd7c8d2) {
    return this.add.bitmapText(x, y, 'preview-font', value, size).setOrigin(0.5).setTint(tint);
  }

  frame(x, y, key, width, height) {
    // En WebGL se conservan los bordes de 6 px. Canvas 2D puede mostrar
    // la comprobación de arranque en equipos sin aceleración de gráficos.
    if (this.game.renderer.type === Phaser.WEBGL) {
      return this.add.nineslice(x, y, key, undefined, width, height, 6, 6, 6, 6);
    }
    return this.add.image(x, y, key).setDisplaySize(width, height);
  }

  drawRoom() {
    this.frame(155, 147, 'panel', 282, 158);
    const tiles = [];
    for (let row = 0; row < 8; row++) {
      for (let column = 0; column < 16; column++) {
        const isBorder = row === 0 || row === 7 || column === 0 || column === 15;
        const floorFrame = [0, 1, 0, 3, 0, 1, 0, 6][(column * 7 + row * 5) % 8];
        const frame = isBorder ? 2 : floorFrame;
        tiles.push(this.add.image(35 + column * 16, 91 + row * 16, 'tiles', frame));
      }
    }
    this.add.image(35 + 7 * 16, 91, 'tiles', 5);
    this.add.image(35 + 7 * 16, 91 + 4 * 16, 'tiles', 4).setScale(2);
    this.add.image(35 + 3 * 16, 91 + 5 * 16, 'tiles', 7);

    // Textura radial blanca para multiplicarla por cada color elemental. Su
    // mezcla aditiva ilumina visualmente los tiles por debajo del proyectil.
    const texture = this.textures.createCanvas('preview-glow', 64, 64);
    const context = texture.getContext();
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,0.65)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.19)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    texture.refresh();

    this.glow = this.add.image(91, 184, 'preview-glow').setBlendMode(Phaser.BlendModes.ADD);
    this.spell = this.add.image(91, 184, 'projectiles', 0).setScale(2);
    this.boss = this.add.image(246, 122, 'bosses', 0).setScale(2);
    this.enemy = this.add.image(76, 126, 'enemies', 0).setScale(2);
    this.anims.create({
      key: 'preview-steps',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 5,
      repeat: -1,
    });
    this.add.sprite(64, 190, 'player', 0).setScale(2).play('preview-steps');
    return tiles;
  }

  drawZodiacPanel() {
    this.frame(382, 147, 'panel', 156, 158);
    this.label(382, 89, 'ZODIACO');
    ZODIAC_SIGNS.forEach((sign, frame) => {
      const x = 337 + (frame % 4) * 30;
      const y = 110 + Math.floor(frame / 4) * 25;
      const unlocked = STARTER_SIGN_IDS.includes(sign.id);
      this.add.image(x, y, 'zodiac', frame).setAlpha(unlocked ? 1 : 0.45);
    });
    this.label(382, 183, 'CRUCE DE EJEMPLO', 8, 0xa698a6);
    this.crossLabel = this.label(382, 197, ' ');
    this.inheritanceLabel = this.label(382, 210, ' ', 8, 0xff9a44);
  }

  drawElementButtons() {
    this.elementButtons = Object.values(ELEMENTS).map((element, index) => {
      const x = 68 + index * 115;
      const button = this.frame(x, 254, 'button', 106, 27).setInteractive({ useHandCursor: true });
      this.label(x, 254, element.name.toUpperCase(), 8, element.color);
      button.on('pointerdown', () => this.previewElement(index));
      return button;
    });
  }

  previewElement(index) {
    const [elementId, element] = Object.entries(ELEMENTS)[index];
    const parent = ZODIAC_SIGNS.find((sign) => sign.element === elementId && sign.modality === 'cardinal');
    const selected = ZODIAC_BY_ID[{ fire: 'capricorn', earth: 'aries', air: 'cancer', water: 'libra' }[elementId]];
    const prediction = predictInheritance(parent.id, selected.id);
    const displayName = (sign) => sign.name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();

    for (const tile of this.floorTiles) tile.setTint(element.roomTint);
    this.glow.setTint(element.color);
    this.spell.setFrame(index * 4);
    this.enemy.setFrame(index * 3 + 2);
    this.boss.setFrame(ZODIAC_SIGNS.indexOf(parent));
    this.crossLabel.setText(`${displayName(parent)}+${displayName(selected)}`);
    this.inheritanceLabel.setText(prediction.hybrid.name.toUpperCase()).setTint(prediction.hybrid.color);
    this.elementButtons.forEach((button, buttonIndex) => button.setAlpha(index === buttonIndex ? 1 : 0.6));
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: gameWidth,
  height: gameHeight,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0e0c14',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  callbacks: {
    postBoot: (game) => game.canvas.setAttribute('aria-label', 'Signed Away. Vista de recursos de la fase 1.'),
  },
  scene: FoundationPreview,
});
