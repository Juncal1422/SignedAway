// Vida y daño en puntos, velocidad en píxeles/s, tiempos en ms. El atlas de
// enemigos usa una columna por arquetipo y una fila por elemento primario.
export const ENEMY_ARCHETYPES = {
  melee: { health: 30, speed: 65, damage: 9, reach: 21, interval: 780, frame: 0 },
  ranged: { health: 23, speed: 45, damage: 8, reach: 116, interval: 1430, frame: 1 },
  elemental: { health: 37, speed: 40, damage: 10, reach: 85, interval: 1760, frame: 2 },
};

export const ENEMY_ELEMENTS = {
  fire: { frameRow: 0, health: 1, speed: 1.08, pattern: 'fan' },
  earth: { frameRow: 1, health: 1.23, speed: 0.85, pattern: 'ward' },
  air: { frameRow: 2, health: 0.87, speed: 1.30, pattern: 'spiral' },
  water: { frameRow: 3, health: 1.09, speed: 0.94, pattern: 'pool' },
  magma: { frameRow: 0, health: 1.20, speed: 0.91, pattern: 'magma' },
  storm: { frameRow: 2, health: 1.01, speed: 1.16, pattern: 'storm' },
};

// Cada jefe alterna patrones. Por debajo del 45% cambia el orden de la
// secuencia, reduce su recuperación y desbloquea una acción final propia.
export const BOSSES = {
  aries: { title: 'Aries del rescoldo', health: 158, speed: 52, damage: 11, interval: 1090, pattern: ['ram', 'fan', 'eruption'] },
  taurus: { title: 'Tauro del sepulcro', health: 212, speed: 36, damage: 14, interval: 1340, pattern: ['shockwave', 'ward', 'ram'] },
  gemini: { title: 'Géminis del umbral', health: 146, speed: 59, damage: 9, interval: 960, pattern: ['cross', 'spiral', 'mirror'] },
  cancer: { title: 'Cáncer de la sima', health: 185, speed: 42, damage: 11, interval: 1170, pattern: ['pool', 'pulse', 'shockwave'] },
  leo: { title: 'Leo de la corona', health: 183, speed: 48, damage: 12, interval: 1230, pattern: ['fan', 'eruption', 'spiral'] },
  virgo: { title: 'Virgo del barro', health: 172, speed: 40, damage: 10, interval: 1220, pattern: ['summon', 'ward', 'cross'] },
  libra: { title: 'Libra del vacío', health: 165, speed: 56, damage: 10, interval: 1090, pattern: ['mirror', 'fan', 'cross'] },
  scorpio: { title: 'Escorpio del abismo', health: 168, speed: 50, damage: 12, interval: 1020, pattern: ['lance', 'pool', 'eruption'] },
  sagittarius: { title: 'Sagitario de la pira', health: 150, speed: 52, damage: 16, interval: 1420, pattern: ['lance', 'cross', 'fan'] },
  capricorn: { title: 'Capricornio de la falla', health: 203, speed: 40, damage: 13, interval: 1270, pattern: ['ward', 'eruption', 'shockwave'] },
  aquarius: { title: 'Acuario del vendaval', health: 156, speed: 56, damage: 10, interval: 1130, pattern: ['spiral', 'pulse', 'mirror'] },
  pisces: { title: 'Piscis del espejo', health: 162, speed: 49, damage: 10, interval: 1090, pattern: ['mirror', 'pool', 'summon'] },
};

export const HYBRID_BOSS_SIGNS = {
  magma: ['aries', 'leo', 'capricorn'],
  storm: ['aquarius', 'cancer', 'pisces'],
};

export const ATTACK_DESCRIPTIONS = {
  ram: ['Embestida', 'Marca su posición y carga en línea recta.'],
  fan: ['Abanico', 'Dispara varios proyectiles hacia ti.'],
  eruption: ['Erupción', 'Marca tu posición y dos puntos a los lados.'],
  shockwave: ['Onda de choque', 'Carga una explosión y dispara en todas direcciones.'],
  ward: ['Baluarte', 'Reduce el daño recibido y prepara una zona de impacto.'],
  cross: ['Cruz', 'Lanza dos cruces de proyectiles giradas entre sí.'],
  spiral: ['Espiral', 'Dispara en círculos, girando entre descargas.'],
  mirror: ['Espejo', 'Dispara un abanico y vuelve a apuntar antes del segundo.'],
  pool: ['Charco', 'Deja una zona dañina persistente en tu posición.'],
  pulse: ['Pulso', 'Combina un anillo de disparos y una explosión localizada.'],
  lance: ['Lanza', 'Carga y dispara un proyectil rápido y estrecho.'],
  summon: ['Invocación', 'Llama a un luchador y dispara en abanico.'],
  magma: ['Charco de magma', 'Deja lava activa durante aproximadamente un segundo.'],
  storm: ['Descarga', 'Lanza dos disparos y marca una explosión bajo tus pies.'],
};
export const ARCHETYPE_DESCRIPTIONS = {
  melee: ['Acechador', 'Se acerca y avisa antes de golpear a corta distancia.'],
  ranged: ['Tirador', 'Conserva distancia y apunta disparos hacia ti.'],
  elemental: ['Custodio', 'Usa el ataque especial de su elemento.'],
};
