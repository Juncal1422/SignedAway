import Phaser from 'phaser';
import { SPELL_DESCRIPTIONS, ZODIAC_BY_ID } from '../data/zodiacData.js';
import { ALL_ELEMENTS } from '../data/elementalPowers.js';
import { MODIFIER_BY_ID } from '../data/spellModifiers.js';
import { ROOM_BOTTOM } from '../systems/MapGenerator.js';

export const ink = { white: 0xe9d8d1, muted: 0xb3a5b1, dim: 0xa195a2, gold: 0xf2bd87 };
export const ZONES = ALL_ELEMENTS;

export function configureCamera(scene) {
  scene.cameras.main.setOrigin(0, 0).setZoom(2);
}

export function label(scene, x, y, value, { size = 8, color = ink.white, align = 0.5 } = {}) {
  return scene.add.bitmapText(x, y, 'pixel-font', String(value).toUpperCase(), size)
    .setOrigin(align, 0.5).setTint(color);
}

export function wrappedLabel(scene, x, y, text, width, options = {}) {
  const size = options.size ?? 8;
  // La fuente retro declara una métrica nativa de 6 px por glifo;
  // Phaser escala el avance a un píxel lógico por cada punto de tamaño.
  const limit = Math.max(1, Math.floor(width / size));
  const lines = [''];
  for (const word of text.split(/\s+/)) {
    const line = lines.at(-1);
    if (line.length && line.length + word.length + 1 > limit) lines.push(word);
    else lines[lines.length - 1] = line ? `${line} ${word}` : word;
  }
  return label(scene, x, y, lines.join('\n'), options).setCenterAlign();
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
  const fontSize = Math.min(options.size ?? 8, Math.floor((width - 10) / text.length));
  const title = label(scene, x, y, text, { color: options.color, size: fontSize });
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
    configureCamera(this);
    this.world = world;
    this.modal = [];
    this.modifierKey = null;
    this.mapKey = null;
    this.noticeTimer = null;
    this.damageBorder = this.add.graphics().setDepth(30);
    for (let inset = 0; inset < 12; inset += 2) {
      this.damageBorder.lineStyle(2, 0xf04655, 0.55 * (1 - inset / 13)).strokeRect(inset, inset, 480 - inset * 2, 288 - inset * 2);
    }
    this.damageBorder.setAlpha(0);
    this.bars = this.add.graphics();
    this.map = this.add.graphics();
    this.healthText = label(this, 17, 12, '', { align: 0 });
    this.dashText = label(this, 17, 35, 'DASH', { align: 0, color: ink.muted });
    this.zoneText = label(this, 240, 12, '');
    this.spellText = label(this, 17, 266, '', { align: 0 });
    this.modifierText = label(this, 17, 279, '', { align: 0, color: ink.muted });
    this.noticeText = label(this, 240, ROOM_BOTTOM + 10, '', { color: ink.gold });
    this.bossText = label(this, 240, 31, '');
    this.levelText = label(this, 463, 45, '', { align: 1, size: 6, color: ink.muted });
    this.pauseButton = button(this, 438, 266, 66, 'PAUSA', () => world.togglePause(), { height: 19 });
    this.sheetButton = button(this, 362, 266, 78, 'FICHA / TAB', () => world.toggleCharacter(), { height: 19 });
    this.renderFloor();
  }

  renderFloor() {
    if (!this.zoneText) return;
    const { floorIndex, route } = this.world;
    const zone = ZONES[route[floorIndex]];
    this.zoneText.setText(`PISO ${floorIndex + 1}/${route.length}  ${zone.name.toUpperCase()}`).setTint(zone.color);
    const { spell, color, build } = this.world.player;
    const powers = build.powers.length ? ` / ${ZONES[build.element].name}` : '';
    this.spellText.setText((spell.name + powers).toUpperCase()).setTint(color);
  }

  update() {
    const { player, boss, room, floor, level, experience, levelCost, bossUnlocked, roomsCleared } = this.world;
    if (!player || !floor) return;
    this.bars.clear();
    this.levelText.setText(`NIVEL ${level} / XP ${experience} DE ${levelCost} / ${bossUnlocked ? 'JEFE ABIERTO' : `SELLO ${roomsCleared}/${floor.requiredClears}`}`);
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
    const mapKey = `${this.world.floorIndex}/${room.id}/${room.cleared}/${bossUnlocked}/${[...floor.rooms.values()].filter((entry) => entry.visited).length}`;
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
      const color = room === current ? 0xf3d6a9 : room.kind === 'boss' ? (this.world.bossUnlocked ? 0xe57991 : 0x83515c) : room.visited ? 0x8b7d95 : 0x4a414f;
      this.map.fillStyle(color).fillRect(x, y, 4, 4);
    }
  }

  clearNotice() {
    this.noticeTimer?.remove(false);
    this.noticeText.setText('');
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

  flashDamage() {
    this.tweens.killTweensOf(this.damageBorder);
    this.damageBorder.setAlpha(1);
    this.tweens.add({ targets: this.damageBorder, alpha: 0, duration: 400 });
  }

  levelUp(level, choices, select) {
    this.modalBackground(`NIVEL ${level}`, 216);
    this.modal.push(label(this, 240, 74, 'ELIGE UNA MEJORA PARA ESTA EXPEDICIÓN', { size: 8, color: ink.muted }));
    choices.forEach((id, index) => {
      const modifier = MODIFIER_BY_ID[id];
      const y = 108 + 48 * index;
      this.modal.push(...button(this, 240, y, 251, modifier.name, () => select(id), { color: ink.gold }));
      this.modal.push(wrappedLabel(this, 240, y + 17, modifier.description, 295, { size: 7, color: ink.muted }));
    });
  }

  characterSheet(close, page = 'stats', index = 0) {
    this.modalBackground('FICHA DE LA EXPEDICIÓN', 248);
    const { player, level, experience, levelCost } = this.world;
    const options = [['stats', 'ESTADÍSTICAS'], ['powers', 'PODERES'], ['modifiers', 'MEJORAS']];
    options.forEach(([id, name], tab) => this.modal.push(...button(this, 139 + tab * 101, 73, 96, name,
      () => this.characterSheet(close, id), { height: 21, color: id === page ? ink.gold : ink.muted })));
    const { build, stats, spell } = player;
    if (page === 'stats') {
      const affinity = build.affinity.damageScale ?? 1;
      const focus = 1 + 0.25 * (player.modifiers.focus ?? 0);
      const damage = Math.round(spell.damage * affinity * focus * 10) / 10;
      const lines = [
        [101, `${ZODIAC_BY_ID[build.signId].name} / NIVEL ${level} / XP ${experience} DE ${levelCost}`, ink.gold],
        [119, `VIDA ${Math.ceil(player.health)} DE ${stats.maxHealth}   VELOCIDAD ${stats.moveSpeed}`],
        [135, `DASH ${stats.dashCooldown} MS   ATAQUE CADA ${spell.cooldown} MS`],
        [153, spell.name, player.color],
        [190, `DAÑO ${damage} = BASE ${spell.damage} X AFINIDAD ${affinity} X FOCO ${focus}`],
      ];
      for (const [y, value, color] of lines) {
        this.modal.push(label(this, 240, y, value, { size: Math.min(8, Math.floor(290 / value.length)), color }));
      }
      this.modal.push(wrappedLabel(this, 240, 170, SPELL_DESCRIPTIONS[spell.kind], 280, { size: 7, color: ink.muted }));
      this.modal.push(wrappedLabel(this, 240, 210, 'Daño por impacto directo antes de defensas y efectos secundarios. La cadencia ya incluye los poderes activos.', 278, { size: 7, color: ink.muted }));
    } else {
      const entries = page === 'powers' ? build.powers.map((id) => ZONES[id])
        : Object.entries(player.modifiers).map(([id, count]) => ({ ...MODIFIER_BY_ID[id], name: `${MODIFIER_BY_ID[id].name} / NIVEL ${count}` }));
      const entry = entries[index];
      if (entry) {
        this.modal.push(label(this, 240, 127, entry.name, { size: 13, color: entry.color ?? ink.gold }));
        this.modal.push(wrappedLabel(this, 240, 159, entry.description, 270, { size: 8 }));
        if (entries.length > 1) this.modal.push(
          ...button(this, 144, 200, 90, 'ANTERIOR', () => this.characterSheet(close, page, (index + entries.length - 1) % entries.length), { height: 19 }),
          label(this, 240, 200, `${index + 1}/${entries.length}`, { color: ink.muted }),
          ...button(this, 336, 200, 90, 'SIGUIENTE', () => this.characterSheet(close, page, (index + 1) % entries.length), { height: 19 }),
        );
      } else this.modal.push(label(this, 240, 148, page === 'powers' ? 'SIN PODERES HEREDADOS' : 'SUBE DE NIVEL PARA ELEGIR UNA MEJORA'));
    }
    this.modal.push(...button(this, 240, 240, 170, 'VOLVER AL COMBATE', close));
  }

  floorCleared(unlockedSign, final, next) {
    this.modalBackground(final ? 'VICTORIA' : 'PISO SUPERADO', 120);
    const text = unlockedSign ? `DESBLOQUEADO: ${ZODIAC_BY_ID[unlockedSign].name}` : 'VIDA RECUPERADA';
    this.modal.push(
      label(this, 240, 131, text, { color: ink.gold }),
      ...button(this, 240, 169, 170, final ? 'VOLVER AL TÍTULO' : 'SIGUIENTE PISO', next),
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
