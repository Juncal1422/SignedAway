import { ELEMENTS } from './zodiacData.js';

const recipes = [
  ['fire', 'earth', 'magma', 'Magma', 0xff9a44, { burn: 0.14 }, 'Los impactos dejan una quemadura.'],
  ['fire', 'water', 'plasma', 'Plasma', 0xf35be1, { damageScale: 1.18 }, 'Aumenta un 18% el daño del ataque.'],
  ['fire', 'air', 'electricity', 'Electricidad', 0xffe65e, { chain: 0.28 }, 'Los impactos saltan a un enemigo cercano.'],
  ['water', 'air', 'storm', 'Tormenta', 0x9aabff, { slow: 0.83, chain: 0.24 }, 'Ralentiza y encadena los impactos.'],
  ['water', 'earth', 'poison', 'Veneno', 0xa9e454, { poison: 0.13 }, 'Los impactos intoxican durante 3 segundos.'],
  ['air', 'earth', 'sand', 'Arena', 0xf1ca81, { slow: 0.78 }, 'Los impactos ralentizan al enemigo.'],
  ['magma', 'air', 'obsidian', 'Obsidiana', 0xc399da, { pierce: 2 }, 'Los disparos atraviesan dos enemigos adicionales.'],
  ['magma', 'water', 'metal', 'Metal', 0xbfcbd7, { armor: 0.16 }, 'Reduce un 16% el daño recibido.'],
  ['plasma', 'air', 'light', 'Luz', 0xfff1ae, { entryDamage: 9 }, 'Daña a todos los enemigos al entrar en combate.'],
  ['plasma', 'earth', 'life', 'Vida', 0x7aefa0, { entryHeal: 7 }, 'Recupera 7 puntos de vida al entrar en combate.'],
  ['electricity', 'earth', 'magnetism', 'Magnetismo', 0xfc8274, { pull: 14 }, 'Los impactos atraen al enemigo hacia ti.'],
  ['electricity', 'water', 'energy', 'Energía', 0x69e4ef, { cooldownScale: 0.82 }, 'Reduce un 18% el tiempo entre ataques.'],
  ['storm', 'earth', 'gravity', 'Gravedad', 0x9c82f6, { entryRoot: 1700 }, 'Inmoviliza a los enemigos 1,7 s al entrar.'],
  ['storm', 'fire', 'chaos', 'Caos', 0xfc7797, { chaos: 0.33 }, 'Un tercio de los impactos inflige daño adicional.'],
  ['poison', 'fire', 'miasma', 'Miasma', 0xd49354, { entryDamage: 16 }, 'Daña a todos los enemigos de la sala al entrar.'],
  ['poison', 'air', 'gas', 'Gas', 0x9fd5a2, { entryPoison: 4 }, 'Intoxica a toda la sala al entrar.'],
  ['sand', 'water', 'time', 'Tiempo', 0x56d6e1, { roomSpeed: 0.66 }, 'Ralentiza enemigos, ataques y disparos en toda la sala.'],
  ['sand', 'fire', 'crystal', 'Cristal', 0xf6a6ef, { entryShield: 1 }, 'Absorbe el primer impacto de cada sala de combate.'],
];

export const HYBRID_ELEMENTS = Object.fromEntries(recipes.map(([left, right, id, name, color, effect, description]) => [
  [left, right].sort().join('+'), { id, name, color, effect, description, ingredients: [left, right] },
]));
export const POWER_BY_ID = Object.fromEntries(Object.values(HYBRID_ELEMENTS).map((power) => [power.id, power]));
export const ALL_ELEMENTS = { ...ELEMENTS, ...POWER_BY_ID };

export function primaryElement(element) {
  return POWER_BY_ID[element] ? primaryElement(POWER_BY_ID[element].ingredients[0]) : element;
}

export function compositeAffinity(powerIds) {
  const product = new Set(['damageScale', 'cooldownScale', 'roomSpeed', 'slow']);
  const affinity = {};
  for (const id of new Set(powerIds)) {
    for (const [key, value] of Object.entries(POWER_BY_ID[id]?.effect ?? {})) {
      affinity[key] = product.has(key) ? (affinity[key] ?? 1) * value : (affinity[key] ?? 0) + value;
    }
  }
  return affinity;
}
