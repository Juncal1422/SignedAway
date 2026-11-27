// El orden de esta lista fija las distancias entre signos y los frames del atlas.
// Las claves se guardarán en el linaje. Cambiar un nombre visible no cambia su clave.
export const ELEMENTS = {
  fire: { name: 'Fuego', color: 0xff623e, roomTint: 0xac827f },
  earth: { name: 'Tierra', color: 0xa9e757, roomTint: 0x90a382 },
  air: { name: 'Aire', color: 0xd5a2ff, roomTint: 0xa394b7 },
  water: { name: 'Agua', color: 0x50d9ff, roomTint: 0x7d9bb2 },
};

// Vida y daño son puntos, las velocidades están en píxeles/s y los tiempos en ms.
// range describe el alcance útil. radius se aplica a áreas, trampas y escudos.
// El campo kind define el comportamiento que implementarán las entidades de combate.
export const ZODIAC_SIGNS = [
  {
    id: 'aries', name: 'Aries', element: 'fire', modality: 'cardinal',
    stats: { maxHealth: 100, moveSpeed: 134, dashCooldown: 720 },
    spell: { name: 'Brasa fugaz', kind: 'bolt', damage: 16, cooldown: 240, speed: 355, range: 184 },
  },
  {
    id: 'taurus', name: 'Tauro', element: 'earth', modality: 'fixed',
    stats: { maxHealth: 127, moveSpeed: 110, dashCooldown: 900 },
    spell: { name: 'Baluarte de roca', kind: 'shield', damage: 22, cooldown: 1150, range: 42, radius: 32, duration: 440 },
  },
  {
    id: 'gemini', name: 'Géminis', element: 'air', modality: 'mutable',
    stats: { maxHealth: 84, moveSpeed: 153, dashCooldown: 650 },
    spell: { name: 'Cuchillas gemelas', kind: 'split', damage: 10, cooldown: 335, speed: 320, range: 192, count: 2, spreadDegrees: 20 },
  },
  {
    id: 'cancer', name: 'Cáncer', element: 'water', modality: 'cardinal',
    stats: { maxHealth: 113, moveSpeed: 122, dashCooldown: 800 },
    spell: { name: 'Marea de resguardo', kind: 'pulse', damage: 24, cooldown: 690, range: 56, radius: 52 },
  },
  {
    id: 'leo', name: 'Leo', element: 'fire', modality: 'fixed',
    stats: { maxHealth: 106, moveSpeed: 126, dashCooldown: 740 },
    spell: { name: 'Corona solar', kind: 'cone', damage: 35, cooldown: 770, range: 82, spreadDegrees: 58 },
  },
  {
    id: 'virgo', name: 'Virgo', element: 'earth', modality: 'mutable',
    stats: { maxHealth: 97, moveSpeed: 128, dashCooldown: 780 },
    spell: { name: 'Guardián de arcilla', kind: 'summon', damage: 10, cooldown: 2050, range: 120, duration: 2500 },
  },
  {
    id: 'libra', name: 'Libra', element: 'air', modality: 'cardinal',
    stats: { maxHealth: 90, moveSpeed: 144, dashCooldown: 640 },
    spell: { name: 'Filo de balanza', kind: 'returning', damage: 18, cooldown: 510, speed: 285, range: 146 },
  },
  {
    id: 'scorpio', name: 'Escorpio', element: 'water', modality: 'fixed',
    stats: { maxHealth: 103, moveSpeed: 125, dashCooldown: 780 },
    spell: { name: 'Aguja abisal', kind: 'piercing', damage: 19, cooldown: 450, speed: 268, range: 225, pierce: 2 },
  },
  {
    id: 'sagittarius', name: 'Sagitario', element: 'fire', modality: 'mutable',
    stats: { maxHealth: 87, moveSpeed: 146, dashCooldown: 690 },
    spell: { name: 'Cometa rojo', kind: 'charged', damage: 44, cooldown: 820, speed: 420, range: 245, chargeTime: 420 },
  },
  {
    id: 'capricorn', name: 'Capricornio', element: 'earth', modality: 'cardinal',
    stats: { maxHealth: 118, moveSpeed: 118, dashCooldown: 830 },
    spell: { name: 'Falla sepulcral', kind: 'trap', damage: 32, cooldown: 890, range: 83, radius: 26, duration: 4000 },
  },
  {
    id: 'aquarius', name: 'Acuario', element: 'air', modality: 'fixed',
    stats: { maxHealth: 94, moveSpeed: 137, dashCooldown: 710 },
    spell: { name: 'Órbita de vendaval', kind: 'orbit', damage: 13, cooldown: 930, range: 41, radius: 37, duration: 900 },
  },
  {
    id: 'pisces', name: 'Piscis', element: 'water', modality: 'mutable',
    stats: { maxHealth: 93, moveSpeed: 140, dashCooldown: 750 },
    spell: { name: 'Espejo de espuma', kind: 'ricochet', damage: 15, cooldown: 520, speed: 266, range: 175, bounces: 2 },
  },
];

export const ZODIAC_BY_ID = Object.fromEntries(ZODIAC_SIGNS.map((sign) => [sign.id, sign]));
export const STARTER_SIGN_IDS = ZODIAC_SIGNS.filter((sign) => sign.modality === 'cardinal')
  .map((sign) => sign.id);
