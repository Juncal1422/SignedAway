import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { ZodiacSelectScene } from './scenes/ZodiacSelectScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

// Una resolución lógica fija mantiene las colisiones y la tipografía estables.
// FIT adapta el canvas al viewport. Phaser AUTO permite arrancar sin WebGL.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 480,
  height: 288,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0e0c14',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  callbacks: {
    postBoot: (game) => game.canvas.setAttribute('aria-label', 'Signed Away. Roguelite de acción cenital.'),
  },
  scene: [BootScene, MenuScene, ZodiacSelectScene, GameScene, UIScene],
});
