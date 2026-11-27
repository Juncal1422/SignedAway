import Phaser from 'phaser';
import { ZODIAC_SIGNS, ZODIAC_BY_ID, SPELL_DESCRIPTIONS } from '../data/zodiacData.js';
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
    this.rolls = new Map();
    this.formula = false;
    this.details = [];
    this.cards = [];
    label(this, 240, 19, this.parentSignId ? 'HERENCIA ZODIACAL' : 'ELIGE TU SIGNO', { size: 16 });
    label(this, 127, 43, this.parentSignId ? 'ELIGE AL DESCENDIENTE' : 'SIGNOS DISPONIBLES', { color: ink.muted, size: 7 });

    ZODIAC_SIGNS.forEach((sign, index) => {
      const x = 42 + (index % 4) * 48;
      const y = 82 + Math.floor(index / 4) * 49;
      const unlocked = saveSystem.progress.unlockedSigns.includes(sign.id);
      const background = frame(this, x, y, 46, 46, 'button');
      this.add.image(x, y - 5, 'zodiac', index).setScale(0.59).setAlpha(unlocked ? 1 : 0.36);
      label(this, x, y + 13, sign.name, { size: Math.min(6, Math.floor(41 / sign.name.length)), color: unlocked ? ink.white : ink.dim });
      if (unlocked) {
        background.setInteractive({ useHandCursor: true });
        background.on('pointerup', () => this.select(sign.id));
      } else background.setAlpha(0.36);
      this.cards.push({ background, sign, unlocked });
    });
    frame(this, 340, 137, 261, 205);
    button(this, 66, 257, 102, 'VOLVER', () => this.scene.start('menu'), { color: ink.muted });
    this.formulaButton = button(this, 169, 257, 102, 'CÁLCULO', () => {
      this.formula = !this.formula;
      this.renderPreview();
    }, { color: ink.muted });
    this.confirmButton = button(this, 347, 257, 228, this.actionText(), () => this.confirm(), { color: ink.gold });
    this.select(this.signId);
  }

  select(signId) {
    this.signId = signId;
    this.build = this.rolls.get(signId) ?? null;
    this.confirmButton[1].setText(this.actionText());
    this.formula = false;
    for (const { background, sign, unlocked } of this.cards) {
      if (unlocked) background.setTint(sign.id === signId ? 0xf6b480 : 0xc9cbd8);
    }
    this.renderPreview();
  }

  actionText() {
    if (this.build) return 'ENTRAR EN LA MAZMORRA';
    return this.parentSignId ? 'TIRAR HERENCIA' : 'CONFIRMAR SIGNO';
  }

  renderPreview() {
    for (const detail of this.details) detail.destroy();
    this.details = [];
    const sign = ZODIAC_BY_ID[this.signId];
    const preview = previewDescendant(this.parentSignId, this.signId, this.ancestor);
    const draw = (x, y, text, options) => this.details.push(label(this, x, y, text, options));
    const wrap = (y, text, options) => this.details.push(wrappedLabel(this, 340, y, text, 233, options));
    const parent = ZODIAC_BY_ID[this.parentSignId];
    const accent = preview?.hybrid?.color ?? ZONES[sign.element].color;
    const cross = parent ? `${parent.name} + ${sign.name}` : `${sign.name} / ${ZONES[sign.element].name}`;
    draw(340, 52, cross, { size: Math.min(13, Math.floor(233 / cross.length)), color: accent });
    draw(340, 69, this.build ? 'RESULTADO DE LA TIRADA' : preview ? 'PREVISIÓN ANTES DE LA TIRADA' : 'ESTADÍSTICAS INICIALES', { color: ink.muted, size: 7 });
    if (this.formula) {
      if (preview) {
        const aspect = preview.aspect;
        const percent = (value) => Math.round(value * 100);
        draw(340, 93, aspect.name, { size: 12, color: ink.gold });
        wrap(119, `Atributos: ${percent(1 - aspect.parentWeight)}% del signo elegido + ${percent(aspect.parentWeight)}% del ascendiente. Se usan las bases zodiacales.`, { size: 7 });
        wrap(163, `Tirada independiente de hasta ${percent(aspect.variation)}% por encima o por debajo. Daño base × ${aspect.damage}. Cadencia base × ${aspect.cooldown}.`.replaceAll('×', 'X'), { size: 7 });
        wrap(208, aspect.id === 'quincunx' ? 'El quincuncio impide la fusión. Conservas tus poderes.'
          : aspect.id === 'opposition' ? 'La oposición admite fusiones básicas.' : 'Si existe una receta compatible, se añade al linaje.', { color: ink.muted, size: 7 });
      } else wrap(135, 'La primera generación usa los valores base del signo. Las tiradas y fusiones empiezan con el primer descendiente.', {});
      return;
    }

    const stats = this.build?.stats ?? sign.stats;
    const attack = this.build?.spell ?? preview?.attack ?? sign.spell;
    const range = ({ min, max }) => min === max ? min : `${min}-${max}`;
    const stat = (key) => preview && !this.build ? range(preview.statRanges[key]) : stats[key];
    const damage = preview && !this.build ? range(preview.damageRange)
      : Number((attack.damage * (this.build?.affinity.damageScale ?? 1)).toFixed(1));
    const cooldown = preview && !this.build ? range(preview.cooldownRange) : attack.cooldown;
    draw(340, 91, `ATAQUE: ${attack.name}`, { color: ink.white, size: 9 });
    wrap(108, SPELL_DESCRIPTIONS[attack.kind], { color: ink.muted, size: 7 });
    draw(340, 128, `VIDA ${stat('maxHealth')}   VELOCIDAD ${stat('moveSpeed')}`, { size: 8 });
    draw(340, 145, `DAÑO ${damage}   CADA ${cooldown} MS`, { size: 8 });
    draw(340, 161, `DASH ${stat('dashCooldown')} MS`, { size: 8 });
    const inherited = this.ancestor?.powers ?? [];
    if (preview) {
      draw(340, 182, `${preview.aspect.name} / ${preview.hybrid ? 'NUEVO: ' + preview.hybrid.name : 'SIN NUEVA FUSIÓN'}`, { color: accent, size: 8 });
      if (preview.hybrid) wrap(199, preview.hybrid.description, { color: ink.white, size: 7 });
      wrap(222, inherited.length ? `CONSERVAS ${inherited.length} PODERES: ${inherited.slice(-4).map((id) => ZONES[id].name).join(' / ')}`
        : (preview.hybrid ? 'EL PODER NUEVO SE SUMA AL ATAQUE' : 'EL SIGNO ELEGIDO APORTA SU ATAQUE'), { size: 7, color: ink.muted });
    } else wrap(197, 'Vence jefes para desbloquear otros signos en esta saga.', { color: ink.muted, size: 8 });
  }

  confirm() {
    if (!this.build) {
      this.build = createDescendant({ parentSignId: this.parentSignId, signId: this.signId, ancestor: this.ancestor });
      this.rolls.set(this.signId, this.build);
      this.formula = false;
      this.confirmButton[1].setText(this.actionText());
      this.renderPreview();
      return;
    }
    if (this.build.hybridId) saveSystem.unlockZone(this.build.hybridId);
    const route = buildFloorRoute(this.signId, this.build.element);
    this.scene.start('game', { build: this.build, route });
  }
}
