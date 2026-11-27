import { ELEMENTS, ZODIAC_BY_ID, ZODIAC_SIGNS } from '../data/zodiacData.js';
import { HYBRID_ELEMENTS, predictInheritance, rollInheritance } from '../data/astrologyTable.js';

const hybridsById = Object.fromEntries(Object.values(HYBRID_ELEMENTS).map((element) => [element.id, element]));

export function affinityColor(element) {
  return (ELEMENTS[element] ?? hybridsById[element]).color;
}

// El personaje inicial usa cifras fijas. Los cruces aplican las fórmulas de
// astrologyTable.js y mantienen el patrón de ataque del signo elegido.
export function createDescendant({ parentSignId = null, signId, random = Math.random }) {
  const sign = Object.hasOwn(ZODIAC_BY_ID, signId) ? ZODIAC_BY_ID[signId] : null;
  if (!sign) throw new RangeError(`Unknown zodiac sign: ${signId}`);
  const inherited = parentSignId ? rollInheritance(parentSignId, signId, random) : {
    signId, aspectId: null, elements: [sign.element], hybridId: null,
    stats: { ...sign.stats }, spell: { ...sign.spell },
  };
  return { ...inherited, parentSignId, element: inherited.hybridId ?? inherited.elements[0] };
}

export function previewDescendant(parentSignId, signId) {
  return parentSignId ? predictInheritance(parentSignId, signId) : null;
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
