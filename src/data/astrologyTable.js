import { ZODIAC_SIGNS, ZODIAC_BY_ID } from './zodiacData.js';

// Los índices representan la separación más corta en la rueda de doce signos.
// Los multiplicadores afectan al valor numérico. Un cooldown menor es mejor.
export const ASTROLOGICAL_ASPECTS = [
  { id: 'conjunction', name: 'Conjunción', damage: 1.16, cooldown: 0.96, variation: 0.12, parentWeight: 0.20 },
  { id: 'semisextile', name: 'Semisextil', damage: 1.00, cooldown: 1.00, variation: 0.10, parentWeight: 0.22 },
  { id: 'sextile', name: 'Sextil', damage: 1.08, cooldown: 0.95, variation: 0.12, parentWeight: 0.23 },
  { id: 'square', name: 'Cuadratura', damage: 1.04, cooldown: 1.04, variation: 0.20, parentWeight: 0.30 },
  { id: 'trine', name: 'Trígono', damage: 1.12, cooldown: 0.90, variation: 0.13, parentWeight: 0.25 },
  { id: 'quincunx', name: 'Quincuncio', damage: 1.02, cooldown: 1.03, variation: 0.15, parentWeight: 0.25 },
  { id: 'opposition', name: 'Oposición', damage: 1.12, cooldown: 1.07, variation: 0.18, parentWeight: 0.30 },
];

// Se ordena el par al consultarlo. El orden de los progenitores sí afecta a los
// stats y a la forma del hechizo, pero ambos órdenes descubren la misma zona.
export const HYBRID_ELEMENTS = {
  'earth+fire': { id: 'magma', name: 'Magma', color: 0xff9a44 },
  'air+water': { id: 'storm', name: 'Tormenta', color: 0xa29bff },
};

export const COMPATIBILITY_TABLE = Object.fromEntries(ZODIAC_SIGNS.map((parent, parentIndex) => [
  parent.id,
  Object.fromEntries(ZODIAC_SIGNS.map((selected, selectedIndex) => {
    const distance = Math.abs(parentIndex - selectedIndex);
    const shortestDistance = Math.min(distance, ZODIAC_SIGNS.length - distance);
    return [selected.id, ASTROLOGICAL_ASPECTS[shortestDistance]];
  })),
]));

function requireSign(signId) {
  if (!Object.hasOwn(ZODIAC_BY_ID, signId)) {
    throw new RangeError(`Unknown zodiac sign: ${signId}`);
  }
  return ZODIAC_BY_ID[signId];
}

// Estas claves aceptan variación cuantitativa. kind, count y otras propiedades
// que cambian la estructura del patrón conservan su valor base.
const variableSpellFields = ['damage', 'cooldown', 'speed', 'range', 'radius', 'duration', 'chargeTime'];

// Predicción pura para una futura pantalla de selección. Cada intervalo usa los
// mismos valores que el cálculo final, de modo que previsualizar no gasta RNG.
export function predictInheritance(parentSignId, selectedSignId) {
  const parent = requireSign(parentSignId);
  const selected = requireSign(selectedSignId);
  const aspect = COMPATIBILITY_TABLE[parent.id][selected.id];
  const elements = [...new Set([selected.element, parent.element])];
  const hybridKey = [...elements].sort().join('+');
  const hybrid = HYBRID_ELEMENTS[hybridKey] ?? null;

  const stats = Object.fromEntries(Object.entries(selected.stats).map(([field, value]) => [
    field,
    value * (1 - aspect.parentWeight) + parent.stats[field] * aspect.parentWeight,
  ]));
  const spell = {
    ...selected.spell,
    damage: selected.spell.damage * aspect.damage,
    cooldown: selected.spell.cooldown * aspect.cooldown,
  };

  // La cuadratura puede alterar más el alcance, el tamaño o la cadencia sin
  // cambiar el patrón base. Cada extracción posterior será independiente.
  const statRanges = Object.fromEntries(Object.entries(stats).map(([field, center]) => [
    field, roundedRange(center, aspect.variation),
  ]));
  const spellRanges = Object.fromEntries(variableSpellFields.filter((field) => field in spell)
    .map((field) => [field, roundedRange(spell[field], aspect.variation)]));

  return { signId: selected.id, aspect, elements, hybrid, stats, spell, statRanges, spellRanges };
}

function roundedRange(center, variation) {
  return {
    min: Math.max(1, Math.round(center * (1 - variation))),
    max: Math.max(1, Math.round(center * (1 + variation))),
  };
}

function rollValue(center, variation, random) {
  // Una muestra uniforme entre 0 y 1 se transforma en una variación simétrica.
  // Se aplica sobre cada magnitud por separado para permitir hijos con pros y contras.
  const multiplier = 1 + (2 * random() - 1) * variation;
  return Math.max(1, Math.round(center * multiplier));
}

export function rollInheritance(parentSignId, selectedSignId, random = Math.random) {
  const prediction = predictInheritance(parentSignId, selectedSignId);
  const variation = prediction.aspect.variation;
  const stats = Object.fromEntries(Object.entries(prediction.stats).map(([field, center]) => [
    field, rollValue(center, variation, random),
  ]));
  const spell = { ...prediction.spell };
  for (const field of Object.keys(prediction.spellRanges)) {
    spell[field] = rollValue(spell[field], variation, random);
  }

  return {
    signId: prediction.signId,
    aspectId: prediction.aspect.id,
    elements: prediction.elements,
    hybridId: prediction.hybrid?.id ?? null,
    stats,
    spell,
  };
}
