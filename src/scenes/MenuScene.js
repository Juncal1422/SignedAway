import Phaser from 'phaser';
import { saveSystem } from '../systems/SaveSystem.js';
import { button, frame, ink, label } from './UIScene.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    // Un altar con los cuatro sigilos cardinales enmarca la entrada al juego.
    const background = this.add.graphics();
    background.fillStyle(0x17131f).fillRect(0, 0, 480, 288);
    background.lineStyle(1, 0x372b41).strokeRect(13, 13, 454, 262);
    for (const [index, frameIndex] of [0, 3, 6, 9].entries()) {
      const x = 174 + 44 * index;
      this.add.image(x, 52, 'zodiac', frameIndex).setScale(1.5);
    }
    label(this, 240, 86, 'SIGNED AWAY', { size: 32 });
    frame(this, 240, 165, 272, 95);
    const { pendingAncestor, unlockedSigns, lineage } = saveSystem.progress;
    button(this, 240, 150, 175, pendingAncestor ? 'CONTINUAR LINAJE' : 'INICIAR PARTIDA',
      () => this.scene.start('zodiac'), { color: ink.gold, height: 29 });
    label(this, 240, 185, `SIGNOS ${unlockedSigns.length}/12  LINAJE ${lineage.length}`, { color: ink.muted });
    label(this, 240, 232, 'WASD / FLECHAS  MOVER    ESPACIO  DASH', { color: ink.muted });
    label(this, 240, 250, 'RATÓN / J  LANZAR    ESC  PAUSA', { color: ink.muted });
    if (!saveSystem.canPersist) label(this, 240, 268, 'GUARDADO LOCAL NO DISPONIBLE', { color: ink.gold });
  }
}
