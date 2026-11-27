import Phaser from 'phaser';
import { ALL_ELEMENTS, POWER_BY_ID, primaryElement } from '../data/elementalPowers.js';
import { ASTROLOGICAL_ASPECTS } from '../data/astrologyTable.js';
import { ARCHETYPE_DESCRIPTIONS, ATTACK_DESCRIPTIONS, BOSSES, ENEMY_ARCHETYPES, ENEMY_ELEMENTS, HYBRID_BOSS_SIGNS } from '../data/enemiesData.js';
import { SPELL_MODIFIERS } from '../data/spellModifiers.js';
import { SPELL_DESCRIPTIONS, ZODIAC_SIGNS, ZODIAC_BY_ID } from '../data/zodiacData.js';
import { saveSystem } from '../systems/SaveSystem.js';
import { button, configureCamera, frame, ink, label, wrappedLabel } from './UIScene.js';

const baseEffects = {
  fire: 'El magma del suelo se activa por pulsos. Los acechadores de este bioma embisten.',
  earth: 'Pilares estrechan los pasillos. Los acechadores y custodios se protegen al atacar.',
  air: 'Las corrientes del suelo empujan. Los tiradores se desplazan en arco y disparan en pareja.',
  water: 'El agua poco profunda reduce tu velocidad al 65%. Los orbes enemigos rebotan.',
};
const effectEntries = [
  ...Object.entries(baseEffects).map(([id, description]) => ({
    category: 'AFINIDADES', title: ALL_ELEMENTS[id].name, description, color: ALL_ELEMENTS[id].color,
  })),
  ...Object.values(POWER_BY_ID).map((power) => ({
    category: 'AFINIDADES', title: power.name, color: power.color, description: power.description,
    detail: power.ingredients.map((id) => ALL_ELEMENTS[id].name).join(' + '),
  })),
  ...ZODIAC_SIGNS.map((sign, index) => ({
    category: 'HECHIZOS', title: sign.spell.name, description: SPELL_DESCRIPTIONS[sign.spell.kind], sprite: ['zodiac', index],
    detail: `${sign.name} / DAÑO BASE ${sign.spell.damage} / ${sign.spell.cooldown} MS ENTRE ATAQUES`,
  })),
  ...SPELL_MODIFIERS.map((modifier) => ({
    category: 'BONOS', title: modifier.name, description: modifier.description, detail: 'MEJORA DE NIVEL DE LA EXPEDICIÓN',
  })),
  ...ASTROLOGICAL_ASPECTS.map((aspect) => ({
    category: 'ASPECTOS', title: aspect.name, detail: 'ASPECTO ZODIACAL',
    description: aspect.id === 'quincunx' ? 'Ajusta valores heredados. No forma una afinidad nueva.'
      : aspect.id === 'opposition' ? 'Puede formar una afinidad básica. No forma una afinidad avanzada.'
        : 'Ajusta valores heredados y puede permitir afinidades básicas o avanzadas.',
  })),
];
const bossEntries = ZODIAC_SIGNS.map((sign, index) => ({
  title: BOSSES[sign.id].title, color: ALL_ELEMENTS[sign.element].color, sprite: ['bosses', index * 8],
  detail: `VIDA BASE ${BOSSES[sign.id].health} / DAÑO BASE ${BOSSES[sign.id].damage}`,
  description: BOSSES[sign.id].pattern.map((id) => ATTACK_DESCRIPTIONS[id].join('. ')).join(' '),
}));
const enemyEntries = Object.entries(ALL_ELEMENTS).flatMap(([id, element]) => {
  const variant = ENEMY_ELEMENTS[id] ?? ENEMY_ELEMENTS[primaryElement(id)];
  const signs = HYBRID_BOSS_SIGNS[id] ?? ZODIAC_SIGNS.filter((sign) => sign.element === primaryElement(id)).map((sign) => sign.id);
  return Object.entries(ARCHETYPE_DESCRIPTIONS).map(([kind, [name, description]]) => ({
    title: `${name} / ${element.name}`, color: element.color,
    sprite: ['enemies', (variant.frameRow * 3 + ENEMY_ARCHETYPES[kind].frame) * 8],
    description: kind === 'elemental' ? ATTACK_DESCRIPTIONS[variant.pattern].join('. ') : description,
    detail: kind === 'elemental' ? `JEFES: ${signs.map((sign) => ZODIAC_BY_ID[sign].name).join(' / ')}` : '',
  }));
});

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    configureCamera(this);
    this.screens = this.add.group();
    this.add.rectangle(240, 144, 480, 288, 0x17131f);
    this.add.rectangle(240, 144, 454, 262).setStrokeStyle(1, 0x372b41);
    this.showTitle();
  }

  items(...items) {
    this.screens.addMultiple(items.flat(Infinity));
  }

  clear() {
    this.screens.clear(true, true);
  }

  showTitle() {
    this.clear();
    for (const [index, frameIndex] of [0, 3, 6, 9].entries()) {
      this.items(this.add.image(174 + 44 * index, 42, 'zodiac', frameIndex).setScale(0.85));
    }
    this.items(label(this, 240, 74, 'SIGNED AWAY', { size: 30 }));
    const { pendingAncestor, unlockedSigns, lineage } = saveSystem.progress;
    this.items(
      button(this, 240, 112, 219, pendingAncestor ? 'CONTINUAR LINAJE' : 'INICIAR PARTIDA',
        () => this.scene.start('zodiac'), { color: ink.gold, height: 29 }),
      label(this, 240, 137, `SIGNOS ${unlockedSigns.length}/12   GENERACIÓN ${lineage.length + 1}`, { color: ink.muted }),
      button(this, 145, 167, 166, 'CATÁLOGO DE EFECTOS', () => this.showEffects()),
      button(this, 335, 167, 166, 'CATÁLOGO DE ENEMIGOS', () => this.showEnemies()),
      button(this, 145, 202, 166, 'HISTORIAL', () => this.showHistory()),
      button(this, 335, 202, 166, 'VOLVER A 1.ª GENERACIÓN', () => this.confirmReset(), { size: 7 }),
      label(this, 240, 233, 'WASD / FLECHAS  MOVER    ESPACIO  DASH', { color: ink.muted }),
      label(this, 240, 250, 'RATÓN / J  LANZAR    TAB  FICHA    ESC  PAUSA', { color: ink.muted }),
    );
    if (!saveSystem.canPersist) this.items(label(this, 240, 268, 'GUARDADO LOCAL NO DISPONIBLE', { color: ink.gold }));
  }

  showEffects(category = 'AFINIDADES') {
    const categories = ['AFINIDADES', 'HECHIZOS', 'BONOS', 'ASPECTOS'];
    const tabs = categories.map((title) => ({
      title, active: title === category, open: () => this.showEffects(title),
    }));
    this.showCatalog('EFECTOS', effectEntries.filter((entry) => entry.category === category), 0, null, tabs);
  }

  showEnemies() {
    this.showCatalog('ENEMIGOS', enemyEntries, 0, { title: 'JEFES', entries: bossEntries });
  }

  showCatalog(title, entries, index = 0, alternate, tabs = []) {
    this.clear();
    const entry = entries[index];
    this.items(label(this, 240, 28, title, { size: 16 }), frame(this, 240, 139, 420, 150));
    tabs.forEach((tab, tabIndex) => this.items(button(this, 87 + tabIndex * 102, 52, 97, tab.title, tab.open, {
      color: tab.active ? ink.gold : ink.muted, height: 17,
    })));
    if (entry?.sprite) this.items(this.add.image(240, 84, ...entry.sprite).setDisplaySize(30, 30));
    if (entry) this.items(
      label(this, 240, 111, entry.title, { size: entry.title.length < 40 ? 11 : 8, color: entry.color ?? ink.gold }),
      wrappedLabel(this, 240, 139, entry.description, 372, { color: ink.white }),
      wrappedLabel(this, 240, 190, entry.detail ?? '', 378, { size: 7, color: ink.muted }),
    );
    else this.items(label(this, 240, 137, 'TODAVÍA NO HAY EXPEDICIONES GUARDADAS'));
    if (entries.length > 1) this.items(
      button(this, 87, 235, 101, 'ANTERIOR', () => this.showCatalog(title, entries, (index + entries.length - 1) % entries.length, alternate, tabs)),
      label(this, 240, 235, `${index + 1} / ${entries.length}`, { color: ink.muted }),
      button(this, 393, 235, 101, 'SIGUIENTE', () => this.showCatalog(title, entries, (index + 1) % entries.length, alternate, tabs)),
    );
    this.items(button(this, 87, 263, 101, 'VOLVER', () => this.showTitle(), { height: 19 }));
    if (alternate) this.items(button(this, 393, 263, 101, alternate.title,
      () => this.showCatalog(alternate.title, alternate.entries, 0, { title, entries }), { height: 19 }));
  }

  confirmReset() {
    this.clear();
    this.items(label(this, 240, 68, 'VOLVER A LA 1.ª GENERACIÓN', { size: 16 }));
    const hasRuns = saveSystem.progress.lineage.length > 0;
    this.items(wrappedLabel(this, 240, 111, hasRuns
      ? 'La saga actual pasará al historial. La nueva saga empezará con sus cuatro signos iniciales y sin poderes heredados.'
      : 'Ya estás en la primera generación de esta saga.', 354));
    this.items(button(this, 240, 214, 170, 'VOLVER', () => this.showTitle()));
    if (hasRuns) this.items(button(this, 240, 176, 170, 'ARCHIVAR Y REINICIAR', () => {
      if (saveSystem.resetSaga()) this.showTitle();
    }, { color: ink.gold }));
  }

  showHistory() {
    const { history, lineage } = saveSystem.progress;
    const sagas = [...history, { runs: lineage, current: true }];
    const entries = sagas.flatMap((saga, index) => {
      const name = saga.current ? 'SAGA ACTUAL' : `SAGA ARCHIVADA ${index + 1}`;
      if (!saga.runs.length) return [];
      return [{
        title: name,
        description: saga.runs.slice(0, 16).map((run) => ZODIAC_BY_ID[run.signId].name).join(' / '),
        detail: `${saga.runs.length} GENERACIONES / ${saga.runs.reduce((count, run) => count + run.bosses.length, 0)} ENCUENTROS`,
      }, ...saga.runs.flatMap((run, generation) => {
        const suffix = `${name} / GENERACIÓN ${generation + 1}`;
        const sign = ZODIAC_BY_ID[run.signId];
        return [{
          title: `${suffix}: ${sign.name}`, color: ALL_ELEMENTS[run.element].color,
          sprite: ['zodiac', ZODIAC_SIGNS.indexOf(sign)],
          description: `Signo: ${sign.name}. Elemento: ${ALL_ELEMENTS[run.element].name}. Poder: ${run.power}.`,
          detail: `${run.outcome === 'victory' ? 'VICTORIA' : 'DERROTA'} / ${run.floors} PISOS / ${run.bosses.length} JEFES ENFRENTADOS`,
        }, ...run.bosses.map((boss) => ({
          title: boss.title ?? BOSSES[boss.signId].title,
          color: ALL_ELEMENTS[boss.element].color,
          sprite: ['bosses', ZODIAC_SIGNS.findIndex((candidate) => candidate.id === boss.signId) * 8],
          description: `${suffix} / ${ALL_ELEMENTS[boss.element].name} / ${boss.defeated ? 'VENCIDO' : 'ENFRENTADO'}`,
          detail: `PODERES: ${(boss.powers ?? []).map((power) => ATTACK_DESCRIPTIONS[power]?.[0] ?? power).join(' / ')}`,
        }))];
      })];
    });
    this.showCatalog('HISTORIAL DEL LINAJE', entries);
  }
}
