import Phaser from 'phaser';
import { ELEMENTS, ZODIAC_SIGNS, ZODIAC_BY_ID, SPELL_DESCRIPTIONS } from '../data/zodiacData.js';
import { createDescendant, previewDescendant, buildFloorRoute } from '../systems/GeneticSystem.js';
import { saveSystem } from '../systems/SaveSystem.js';
import { button, configureCamera, frame, ink, label, wrappedLabel, ZONES } from './UIScene.js';

export class ZodiacSelectScene extends Phaser.Scene {
  constructor() {
    super('zodiac');
  }

  create() {
    configureCamera(this);
    this.ancestor = saveSystem.ancestor;
    this.parentSignId = saveSystem.progress.pendingAncestor;
    this.signId = this.parentSignId ?? saveSystem.progress.unlockedSigns[0];
    this.build = null;
    this.details = [];
    this.cards = [];
    label(this, 240, 26, this.parentSignId ? 'ELIGE UN DESCENDIENTE' : 'ELIGE TU SIGNO', { size: 16 });
    if (this.parentSignId) {
      const parent = ZODIAC_BY_ID[this.parentSignId];
      label(this, 240, 45, `ASCENDIENTE: ${parent.name}`, { color: ELEMENTS[parent.element].color });
    } else {
      label(this, 240, 45, 'LOS DEMÁS SIGNOS SE ABREN AL VENCER JEFES', { color: ink.muted });
    }

    ZODIAC_SIGNS.forEach((sign, index) => {
      const x = 44 + (index % 4) * 55;
      const y = 88 + Math.floor(index / 4) * 62;
      const unlocked = saveSystem.progress.unlockedSigns.includes(sign.id);
      const background = frame(this, x, y, 53, 56, 'button');
      this.add.image(x, y - 9, 'zodiac', index).setScale(0.75).setAlpha(unlocked ? 1 : 0.38);
      label(this, x, y + 11, sign.name, { size: 6, color: unlocked ? ink.white : ink.dim });
      if (unlocked) {
        background.setInteractive({ useHandCursor: true });
        background.on('pointerup', () => this.select(sign.id));
      } else {
        background.setAlpha(0.39);
      }
      this.cards.push({ background, sign, unlocked });
    });
    frame(this, 353, 150, 220, 181);
    button(this, 91, 257, 142, 'VOLVER', () => this.scene.start('menu'), { color: ink.muted });
    this.confirmButton = button(this, 353, 257, 215, 'CONFIRMAR SIGNO', () => this.confirm(), { color: ink.gold });
    this.select(this.signId);
  }

  select(signId) {
    if (this.build || !saveSystem.progress.unlockedSigns.includes(signId)) return;
    this.signId = signId;
    for (const { background, sign, unlocked } of this.cards) {
      if (unlocked) background.setTint(sign.id === signId ? 0xf1b989 : 0xd0c0cb);
    }
    const sign = ZODIAC_BY_ID[signId];
    const prediction = previewDescendant(this.parentSignId, signId, this.ancestor);
    const color = ELEMENTS[sign.element].color;
    const attack = (prediction?.hybrid || this.ancestor?.powers.length) && this.ancestor
      ? ZODIAC_BY_ID[this.ancestor.basicSignId].spell : sign.spell;
    const stat = (key) => prediction ? `${prediction.statRanges[key].min}-${prediction.statRanges[key].max}` : sign.stats[key];
    this.setDetails([
      [78, sign.name, 16, color],
      [98, attack.name, 8, ink.white],
      [132, `VIDA ${stat('maxHealth')}   VELOCIDAD ${stat('moveSpeed')}`, 8, ink.muted],
      [150, `DAÑO ${prediction ? `${Math.round(attack.damage * prediction.spellRanges.damage.min / sign.spell.damage)}-${Math.round(attack.damage * prediction.spellRanges.damage.max / sign.spell.damage)}` : attack.damage}`, 8, ink.muted],
      [168, `DASH ${stat('dashCooldown')} MS`, 8, ink.muted],
      [195, prediction?.aspect.name ?? ZONES[sign.element].name, 8, ink.gold],
      [215, prediction?.hybrid ? `PODER: ${prediction.hybrid.name}` : (this.ancestor?.powers.length ? 'CONSERVA PODERES HEREDADOS' : ''), 8, prediction?.hybrid?.color],
    ]);
    this.details.push(wrappedLabel(this, 353, 116, SPELL_DESCRIPTIONS[attack.kind], 194, { size: 6, color: ink.muted }));
    if (prediction?.hybrid) this.details.push(wrappedLabel(this, 353, 230, prediction.hybrid.description, 195, { size: 6, color: ink.muted }));
  }

  setDetails(lines) {
    for (const detail of this.details) detail.destroy();
    this.details = lines.map(([y, text, size, color]) => label(this, 353, y, text, { color, size }));
  }

  confirm() {
    if (!this.build) {
      this.build = createDescendant({ parentSignId: this.parentSignId, signId: this.signId, ancestor: this.ancestor });
      // Se revela la tirada antes de pasar a combate. En la primera partida
      // se muestran las cifras base, que no dependen de RNG.
      const { stats, spell } = this.build;
      const zone = ZONES[this.build.element];
      this.confirmButton[1].setText('ENTRAR EN LA MAZMORRA');
      this.setDetails([
        [87, ZODIAC_BY_ID[this.signId].name, 16, zone.color],
        [108, spell.name, 8, ink.white],
        [132, `VIDA ${stats.maxHealth}   VELOCIDAD ${stats.moveSpeed}`, 8, ink.muted],
        [150, `DAÑO ${spell.damage}   LANZAR ${spell.cooldown} MS`, 8, ink.muted],
        [168, `DASH ${stats.dashCooldown} MS`, 8, ink.muted],
        [195, `AFINIDAD: ${this.build.elements.map((element) => ZONES[element].name).join(' + ')}`, 8, ink.gold],
        [215, this.build.hybridId ? `ZONA ${zone.name}` : '', 8, zone.color],
      ]);
      return;
    }
    if (this.build.hybridId) saveSystem.unlockZone(this.build.hybridId);
    const route = buildFloorRoute(this.signId, saveSystem.progress.unlockedZones);
    this.scene.start('game', { build: this.build, route });
  }
}
