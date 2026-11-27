import Phaser from 'phaser';
import { ELEMENTS, ZODIAC_BY_ID } from '../data/zodiacData.js';
import { HYBRID_ELEMENTS } from '../data/astrologyTable.js';
import { MODIFIER_BY_ID } from '../data/spellModifiers.js';
import { ROOM_BOTTOM } from '../systems/MapGenerator.js';

export const ink = { white: 0xe9d8d1, muted: 0xb3a5b1, dim: 0xa195a2, gold: 0xf2bd87 };
export const ZONES = {
  ...ELEMENTS,
  ...Object.fromEntries(Object.values(HYBRID_ELEMENTS).map((element) => [element.id, element])),
};

export function label(scene, x, y, value, { size = 8, color = ink.white, align = 0.5 } = {}) {
  return scene.add.bitmapText(x, y, 'pixel-font', String(value).toUpperCase(), size)
    .setOrigin(align, 0.5).setTint(color);
}

export function frame(scene, x, y, width, height, key = 'panel') {
  // Phaser solo admite NineSlice en WebGL. Se conserva un marco legible al
  // arrancar con Canvas 2D, donde las esquinas se escalan con la imagen.
  if (scene.game.renderer.type === Phaser.WEBGL) {
    return scene.add.nineslice(x, y, key, undefined, width, height, 6, 6, 6, 6);
  }
  return scene.add.image(x, y, key).setDisplaySize(width, height);
}

export function button(scene, x, y, width, text, callback, options = {}) {
  const background = frame(scene, x, y, width, options.height ?? 26, 'button');
  const title = label(scene, x, y, text, { color: options.color, size: options.size });
  background.setInteractive({ useHandCursor: true });
  background.on('pointerover', () => background.setAlpha(0.78));
  background.on('pointerout', () => background.setAlpha(1));
  background.on('pointerup', callback);
  return [background, title];
}

export class UIScene extends Phaser.Scene {
  constructor() {
    super('hud');
  }

  create({ world }) {
    this.world = world;
    this.modal = [];
    this.modifierKey = null;
    this.mapKey = null;
    this.noticeTimer = null;
    this.bars = this.add.graphics();
    this.map = this.add.graphics();
    this.healthText = label(this, 17, 12, '', { align: 0 });
    this.dashText = label(this, 17, 35, 'DASH', { align: 0, color: ink.muted });
    this.zoneText = label(this, 240, 12, '');
    this.spellText = label(this, 17, 266, '', { align: 0 });
    this.modifierText = label(this, 17, 279, '', { align: 0, color: ink.muted });
    this.noticeText = label(this, 240, ROOM_BOTTOM + 10, '', { color: ink.gold });
    this.bossText = label(this, 240, 31, '');
    this.pauseButton = button(this, 438, 266, 66, 'PAUSA', () => world.togglePause(), { height: 19 });
    this.renderFloor();
  }

  renderFloor() {
    if (!this.zoneText) return;
    const { floorIndex, route } = this.world;
    const zone = ZONES[route[floorIndex]];
    this.zoneText.setText(`PISO ${floorIndex + 1}/${route.length}  ${zone.name.toUpperCase()}`).setTint(zone.color);
    this.spellText.setText(this.world.player.spell.name.toUpperCase()).setTint(this.world.player.color);
  }

  update() {
    const { player, boss, room, floor } = this.world;
    if (!player?.alive || !floor) return;
    this.bars.clear();
    this.healthText.setText(`VIDA ${Math.ceil(player.health)}/${player.stats.maxHealth}`);
    this.bar(17, 18, 101, player.health / player.stats.maxHealth, 0xc75873);
    this.bar(48, 32, 70, 1 - player.dashCooldown / player.stats.dashCooldown, 0x9dd6e5);
    if (player.spell.chargeTime && player.charge > 0) {
      this.bar(17, 249, 101, player.charge / player.spell.chargeTime, player.color);
    }
    if (boss?.alive) {
      this.bossText.setText(boss.title.toUpperCase()).setTint(boss.color);
      this.bar(162, 38, 156, boss.health / boss.maxHealth, boss.color);
    } else {
      this.bossText.setText('');
    }
    const modifierKey = JSON.stringify(player.modifiers);
    if (modifierKey !== this.modifierKey) {
      this.modifierKey = modifierKey;
      this.modifierText.setText(Object.entries(player.modifiers)
        .map(([id, count]) => `${MODIFIER_BY_ID[id].shortName.toUpperCase()} ${count}`).join(' / '));
    }
    const mapKey = `${this.world.floorIndex}/${room.id}/${room.cleared}/${[...floor.rooms.values()].filter((entry) => entry.visited).length}`;
    if (mapKey !== this.mapKey) {
      this.mapKey = mapKey;
      this.drawMap(floor, room);
    }
  }

  bar(x, y, width, ratio, color) {
    this.bars.fillStyle(0x342a3a).fillRect(x, y, width, 4);
    this.bars.fillStyle(color).fillRect(x, y, Math.max(0, Math.min(width, Math.round(width * ratio))), 3);
  }

  drawMap(floor, current) {
    this.map.clear();
    const rooms = [...floor.rooms.values()];
    const minX = Math.min(...rooms.map((room) => room.x));
    const maxX = Math.max(...rooms.map((room) => room.x));
    const minY = Math.min(...rooms.map((room) => room.y));
    const startX = 475 - (maxX - minX + 1) * 6;
    const point = (room) => [startX + (room.x - minX) * 6, 4 + (room.y - minY) * 6];
    for (const room of rooms) {
      const [x, y] = point(room);
      for (const id of Object.values(room.doors)) {
        const [nextX, nextY] = point(floor.rooms.get(id));
        this.map.lineStyle(1, 0x504453).lineBetween(x + 2, y + 2, nextX + 2, nextY + 2);
      }
    }
    for (const room of rooms) {
      const [x, y] = point(room);
      const color = room === current ? 0xf3d6a9 : room.kind === 'boss' ? 0xc76b87 : room.visited ? 0x8b7d95 : 0x4a414f;
      this.map.fillStyle(color).fillRect(x, y, 4, 4);
    }
  }

  showNotice(text, color) {
    this.noticeTimer?.remove(false);
    this.noticeText.setText(text).setTint(color);
    this.noticeTimer = this.time.delayedCall(2300, () => this.noticeText.setText(''));
  }

  closeModal() {
    for (const object of this.modal) object.destroy();
    this.modal = [];
  }

  modalBackground(title, height) {
    this.closeModal();
    const overlay = this.add.rectangle(240, 144, 480, 288, 0x090710, 0.78).setInteractive();
    this.modal.push(overlay, frame(this, 240, 144, 328, height), label(this, 240, 161 - height / 2, title, { size: 16 }));
  }

  offerModifiers(choices, select) {
    this.modalBackground('ELIGE UNA MEJORA', 161);
    choices.forEach((modifier, index) => {
      const y = 110 + index * 39;
      this.modal.push(...button(this, 240, y, 280, modifier.name, () => select(modifier.id), { color: ink.gold }),
        label(this, 240, y + 19, modifier.description, { color: ink.muted }));
    });
  }

  floorCleared(unlockedSign, final, next) {
    this.modalBackground(final ? 'VICTORIA' : 'PISO SUPERADO', 120);
    const text = unlockedSign ? `DESBLOQUEADO: ${ZODIAC_BY_ID[unlockedSign].name}` : 'VIDA RECUPERADA';
    this.modal.push(
      label(this, 240, 131, text, { color: ink.gold }),
      ...button(this, 240, 169, 170, final ? 'CONTINUAR LINAJE' : 'SIGUIENTE PISO', next),
    );
  }

  defeat(floors, next) {
    this.modalBackground('FIN DE LA PARTIDA', 120);
    this.modal.push(
      label(this, 240, 131, `PISOS SUPERADOS: ${floors}`, { color: ink.muted }),
      ...button(this, 240, 169, 170, 'CONTINUAR LINAJE', next),
    );
  }

  pause(resume, quit) {
    this.modalBackground('PAUSA', 145);
    this.modal.push(
      ...button(this, 240, 128, 170, 'REANUDAR', resume),
      ...button(this, 240, 166, 170, 'VOLVER AL TÍTULO', quit, { color: ink.muted }),
    );
  }
}
