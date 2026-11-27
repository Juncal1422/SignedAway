import { ELEMENTS } from './zodiacData.js';

const recipes = [
  ['fire', 'earth', 'magma', 'Magma', 0xff9a44, { burn: 0.14 }, 'En cada impacto aplica 4 pulsos de quemadura, cada uno del 14% del daño.'],
  ['fire', 'water', 'plasma', 'Plasma', 0xf35be1, { damageScale: 1.18 }, 'Aumenta un 18% el daño del ataque.'],
  ['fire', 'air', 'electricity', 'Electricidad', 0xffe65e, { chain: 0.28 }, 'El impacto salta a un enemigo a 85 px o menos con un 28% del daño.'],
  ['water', 'air', 'storm', 'Tormenta', 0x9aabff, { slow: 0.83, chain: 0.24 }, 'Reduce la velocidad un 17% y encadena un 24% del daño.'],
  ['water', 'earth', 'poison', 'Veneno', 0xa9e454, { poison: 0.13 }, 'Intoxica durante 3 s. Inflige 5 pulsos del 13% del daño.'],
  ['air', 'earth', 'sand', 'Arena', 0xf1ca81, { slow: 0.78 }, 'Cada impacto reduce un 22% la velocidad durante 1,2 s.'],
  ['magma', 'air', 'obsidian', 'Obsidiana', 0xc399da, { pierce: 2 }, 'Los disparos atraviesan dos enemigos adicionales.'],
  ['magma', 'water', 'metal', 'Metal', 0xbfcbd7, { armor: 0.16 }, 'Reduce un 16% el daño recibido.'],
  ['plasma', 'air', 'light', 'Luz', 0xfff1ae, { entryDamage: 9 }, 'Inflige 9 de daño a cada enemigo al entrar en combate.'],
  ['plasma', 'earth', 'life', 'Vida', 0x7aefa0, { entryHeal: 7 }, 'Recupera 7 puntos de vida al entrar en combate.'],
  ['electricity', 'earth', 'magnetism', 'Magnetismo', 0xfc8274, { pull: 14 }, 'Los impactos atraen al enemigo hasta 14 px hacia ti.'],
  ['electricity', 'water', 'energy', 'Energía', 0x69e4ef, { cooldownScale: 0.82 }, 'Reduce un 18% el tiempo entre ataques.'],
  ['storm', 'earth', 'gravity', 'Gravedad', 0x9c82f6, { entryRoot: 1700 }, 'Inmoviliza a los enemigos 1,7 s al entrar.'],
  ['storm', 'fire', 'chaos', 'Caos', 0xfc7797, { chaos: 0.33 }, 'Cada impacto tiene un 33% de probabilidad de infligir un 50% más de daño.'],
  ['poison', 'fire', 'miasma', 'Miasma', 0xd49354, { entryDamage: 16 }, 'Inflige 16 de daño a cada enemigo al entrar en combate.'],
  ['poison', 'air', 'gas', 'Gas', 0x9fd5a2, { entryPoison: 4 }, 'Al entrar, intoxica a cada enemigo con 5 pulsos de 4 de daño.'],
  ['sand', 'water', 'time', 'Tiempo', 0x56d6e1, { roomSpeed: 0.66 }, 'Enemigos, ataques y disparos avanzan al 66% de su ritmo en toda la sala.'],
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
