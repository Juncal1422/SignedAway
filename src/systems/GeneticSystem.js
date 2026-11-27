import { ELEMENTS, ZODIAC_BY_ID, ZODIAC_SIGNS } from '../data/zodiacData.js';
import { predictInheritance, rollInheritance } from '../data/astrologyTable.js';

import { ALL_ELEMENTS, compositeAffinity, POWER_BY_ID, primaryElement } from '../data/elementalPowers.js';

export function affinityColor(element) {
  return ALL_ELEMENTS[element].color;
}

function inheritedAttack(sign, parentSignId, ancestor, powers) {
  const id = powers.length ? ancestor?.basicSignId ?? parentSignId : sign.id;
  return ZODIAC_BY_ID[id ?? sign.id];
}

function scaleAttack(value, targetBase, sourceBase) {
  return Math.max(1, Math.round(targetBase * value / sourceBase));
}

export function createDescendant({ parentSignId = null, ancestor = null, signId, random = Math.random }) {
  const sign = Object.hasOwn(ZODIAC_BY_ID, signId) ? ZODIAC_BY_ID[signId] : null;
  if (!sign) throw new RangeError(`Unknown zodiac sign: ${signId}`);
  const knownPowers = ancestor?.powers ?? [];
  const inherited = parentSignId ? rollInheritance(parentSignId, signId, random, knownPowers) : {
    signId, aspectId: null, elements: [sign.element], hybridId: null,
    stats: { ...sign.stats }, spell: { ...sign.spell },
  };
  const powers = inherited.hybridId ? [...knownPowers, inherited.hybridId] : [...knownPowers];
  const basic = inheritedAttack(sign, parentSignId, ancestor, powers);
  // Tras obtener una afinidad, el ataque anterior viaja con el linaje. Las
  // nuevas tiradas siguen ajustando su daño y cadencia sin cambiar su forma.
  if (basic.id !== sign.id) {
    inherited.spell = {
      ...basic.spell,
      damage: scaleAttack(inherited.spell.damage, basic.spell.damage, sign.spell.damage),
      cooldown: scaleAttack(inherited.spell.cooldown, basic.spell.cooldown, sign.spell.cooldown),
    };
  }
  const affinity = compositeAffinity(powers);
  inherited.spell.cooldown = Math.max(80, Math.round(inherited.spell.cooldown * (affinity.cooldownScale ?? 1)));
  return {
    ...inherited, parentSignId, powers, affinity,
    basicSignId: basic.id, attackElement: basic.element,
    element: inherited.hybridId ?? powers.at(-1) ?? sign.element,
  };
}

export function previewDescendant(parentSignId, signId, ancestor) {
  if (!parentSignId) return null;
  const sign = ZODIAC_BY_ID[signId];
  const knownPowers = ancestor?.powers ?? [];
  const preview = predictInheritance(parentSignId, signId, knownPowers);
  const powers = preview.hybrid ? [...knownPowers, preview.hybrid.id] : knownPowers;
  const attack = inheritedAttack(sign, parentSignId, ancestor, powers).spell;
  const affinity = compositeAffinity(powers);
  const damage = (value) => Number((scaleAttack(value, attack.damage, sign.spell.damage) * (affinity.damageScale ?? 1)).toFixed(1));
  const cooldown = (value) => Math.max(80, Math.round(scaleAttack(value, attack.cooldown, sign.spell.cooldown) * (affinity.cooldownScale ?? 1)));
  return {
    ...preview, powers, attack, affinity,
    damageRange: { min: damage(preview.spellRanges.damage.min), max: damage(preview.spellRanges.damage.max) },
    cooldownRange: { min: cooldown(preview.spellRanges.cooldown.min), max: cooldown(preview.spellRanges.cooldown.max) },
  };
}

// Vencer un piso desbloquea primero su signo si está cerrado. Si ya lo estaba,
// abre otro signo del mismo elemento. Así repetir un jefe también da progreso.
export function unlockFloorReward(saveSystem, element, bossSignId) {
  const candidates = [
    ZODIAC_BY_ID[bossSignId],
    ...ZODIAC_SIGNS.filter((sign) => sign.element === primaryElement(element)),
  ];
  return candidates.find((sign) => saveSystem.unlockSign(sign.id))?.id ?? null;
}

// La afinidad más reciente puede alterar su bioma de origen. El número de
// pisos y el orden de los cuatro biomas se mantienen en todas las generaciones.
export function buildFloorRoute(signId, affinity) {
  const elements = Object.keys(ELEMENTS);
  const startIndex = elements.indexOf(ZODIAC_BY_ID[signId].element);
  const route = [...elements.slice(startIndex), ...elements.slice(0, startIndex)];
  return Object.hasOwn(POWER_BY_ID, affinity)
    ? route.map((element) => element === primaryElement(affinity) ? affinity : element)
    : route;
}
