import { ELEMENTS, ZODIAC_BY_ID, ZODIAC_SIGNS } from '../data/zodiacData.js';
import { predictInheritance, rollInheritance } from '../data/astrologyTable.js';

import { ALL_ELEMENTS, compositeAffinity } from '../data/elementalPowers.js';

export function affinityColor(element) {
  return ALL_ELEMENTS[element].color;
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
  const inheritedBasic = (powers.length || knownPowers.length) && (ancestor?.basicSignId ?? parentSignId);
  const basic = inheritedBasic ? ZODIAC_BY_ID[inheritedBasic] : sign;
  // Tras obtener una afinidad, el ataque anterior viaja con el linaje. Las
  // nuevas tiradas siguen ajustando su daño y cadencia sin cambiar su forma.
  if (basic.id !== sign.id) {
    inherited.spell = {
      ...basic.spell,
      damage: Math.max(1, Math.round(basic.spell.damage * inherited.spell.damage / sign.spell.damage)),
      cooldown: Math.max(1, Math.round(basic.spell.cooldown * inherited.spell.cooldown / sign.spell.cooldown)),
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
  return parentSignId ? predictInheritance(parentSignId, signId, ancestor?.powers) : null;
}

// Vencer un piso desbloquea primero su signo si está cerrado. Si ya lo estaba,
// abre otro signo del mismo elemento. Así repetir un jefe también da progreso.
export function unlockFloorReward(saveSystem, element, bossSignId) {
  const candidates = [
    ZODIAC_BY_ID[bossSignId],
    ...ZODIAC_SIGNS.filter((sign) => sign.element === element),
  ];
  return candidates.find((sign) => saveSystem.unlockSign(sign.id))?.id ?? null;
}

// La ruta rota a partir del signo elegido. Los dos pisos híbridos desbloqueados
// se añaden al final. Elegir hijo nunca quita acceso a zonas ya descubiertas.
export function buildFloorRoute(signId, unlockedZones) {
  const elements = Object.keys(ELEMENTS);
  const startIndex = elements.indexOf(ZODIAC_BY_ID[signId].element);
  return [...elements.slice(startIndex), ...elements.slice(0, startIndex), ...unlockedZones];
}
