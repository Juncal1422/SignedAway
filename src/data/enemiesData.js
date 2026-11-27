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
  aries: { title: 'Aries del rescoldo', health: 235, speed: 52, damage: 11, interval: 1090, style: 'brawler', pattern: ['charge', 'trench', 'stampede'] },
  taurus: { title: 'Tauro del sepulcro', health: 278, speed: 36, damage: 14, interval: 1340, style: 'anchor', pattern: ['hammer', 'barricade', 'quake'] },
  gemini: { title: 'Géminis del umbral', health: 216, speed: 59, damage: 9, interval: 960, style: 'skirmish', pattern: ['twins', 'trade', 'pincer'] },
  cancer: { title: 'Cáncer de la sima', health: 247, speed: 42, damage: 11, interval: 1170, style: 'anchor', pattern: ['tide', 'shell', 'undertow'] },
  leo: { title: 'Leo de la corona', health: 253, speed: 48, damage: 12, interval: 1230, style: 'brawler', pattern: ['pounce', 'claw', 'pride'] },
  virgo: { title: 'Virgo del barro', health: 242, speed: 40, damage: 10, interval: 1220, style: 'keeper', pattern: ['roots', 'seed', 'garden'] },
  libra: { title: 'Libra del vacío', health: 224, speed: 56, damage: 10, interval: 1090, style: 'skirmish', pattern: ['scale', 'verdict', 'inversion'] },
  scorpio: { title: 'Escorpio del abismo', health: 235, speed: 50, damage: 12, interval: 1020, style: 'skirmish', pattern: ['sting', 'burrow', 'brood'] },
  sagittarius: { title: 'Sagitario de la pira', health: 212, speed: 52, damage: 16, interval: 1420, style: 'sniper', pattern: ['snipe', 'retreat', 'volley'] },
  capricorn: { title: 'Capricornio de la falla', health: 276, speed: 40, damage: 13, interval: 1270, style: 'anchor', pattern: ['fault', 'rockfall', 'avalanche'] },
  aquarius: { title: 'Acuario del vendaval', health: 231, speed: 56, damage: 10, interval: 1130, style: 'keeper', pattern: ['gust', 'vortex', 'stormfront'] },
  pisces: { title: 'Piscis del espejo', health: 224, speed: 49, damage: 10, interval: 1090, style: 'sniper', pattern: ['bounce', 'shoal', 'reflection'] },
};

export const HYBRID_BOSS_SIGNS = {
  magma: ['aries', 'leo', 'capricorn'],
  storm: ['aquarius', 'cancer', 'pisces'],
};

export const ATTACK_DESCRIPTIONS = {
  charge: ['Carrera', 'Embestida larga por un carril marcado.'],
  trench: ['Surco', 'Explosión lineal por el eje de la arena.'],
  stampede: ['Estampida', 'Dos embestidas consecutivas desde ángulos distintos.'],
  hammer: ['Martillazo', 'Golpea el suelo muy cerca del jefe.'],
  barricade: ['Bastión', 'Endurece su armadura y prepara un golpe.'],
  quake: ['Temblor', 'Estallan dos bandas separadas por una franja segura.'],
  twins: ['Gemelos', 'Invoca dos tiradores de apoyo.'],
  trade: ['Intercambio', 'Cambia de posición con un doble y dispara en cruz.'],
  pincer: ['Pinza', 'Cruza dos líneas de ataque en la posición del jugador.'],
  tide: ['Pleamar', 'Una banda de agua cruza la sala.'],
  shell: ['Caparazón', 'Se protege mientras deja charcos en la arena.'],
  undertow: ['Resaca', 'Dos olas recorren lados alternos de la arena.'],
  pounce: ['Salto', 'Salta a un punto marcado y golpea al aterrizar.'],
  claw: ['Garra', 'Ejecuta dos cortes cortos en diagonal.'],
  pride: ['Jaula solar', 'Salta y cierra dos carriles alrededor del punto marcado.'],
  roots: ['Enraizar', 'Brotes aparecen con retraso bajo el objetivo.'],
  seed: ['Semillas', 'Coloca un guardián de apoyo.'],
  garden: ['Jardín', 'Siembra brotes persistentes y llama a un guardián.'],
  scale: ['Balanza', 'Barre uno de los lados de la arena.'],
  verdict: ['Veredicto', 'Marca una línea fina y la corta de un extremo al otro.'],
  inversion: ['Inversión', 'Ataca los dos lados en secuencia.'],
  sting: ['Aguijón', 'Disparo único de gran velocidad.'],
  burrow: ['Enterrarse', 'Se traslada y deja veneno persistente.'],
  brood: ['Nido', 'Deja dos charcos y aparece junto al objetivo.'],
  snipe: ['Puntería', 'Apunta antes de lanzar una flecha veloz.'],
  retreat: ['Paso atrás', 'Esquiva hacia una posición lejana.'],
  volley: ['Tiro triple', 'Reapunta entre tres flechas separadas.'],
  fault: ['Falla', 'Rompe el suelo en línea diagonal.'],
  rockfall: ['Derrumbe', 'Caen rocas en puntos amplios y separados.'],
  avalanche: ['Avalancha', 'Tres derrumbes recorren una fila consecutivamente.'],
  gust: ['Ráfaga', 'Barre el centro con un frente de viento.'],
  vortex: ['Vórtice', 'Atrae brevemente al jugador hacia el centro.'],
  stormfront: ['Frente', 'Alterna ráfagas en ejes perpendiculares.'],
  bounce: ['Rebote', 'Dispara dos orbes que rebotan en las paredes.'],
  shoal: ['Cardumen', 'Dos zonas de agua siguen al objetivo.'],
  reflection: ['Reflejo', 'Cambia de lado y lanza tres orbes que rebotan.'],
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
