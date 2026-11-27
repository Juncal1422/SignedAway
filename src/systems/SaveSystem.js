import { STARTER_SIGN_IDS, ZODIAC_BY_ID } from '../data/zodiacData.js';
import { ALL_ELEMENTS, POWER_BY_ID } from '../data/elementalPowers.js';

const storageKey = 'signed-away.progress';
const version = 3;

function initialProgress() {
  return { version, unlockedSigns: [...STARTER_SIGN_IDS], unlockedZones: [], lineage: [], history: [], pendingAncestor: null };
}

function isSign(id) {
  return typeof id === 'string' && Object.hasOwn(ZODIAC_BY_ID, id);
}

function validEntry(entry) {
  return entry && isSign(entry.signId) && ['defeat', 'victory'].includes(entry.outcome)
    && Number.isSafeInteger(entry.floors) && entry.floors >= 0;
}

// Los guardados de la versión 1 conservan sus expediciones. Solo las nuevas
// pueden incluir encuentros individuales, que antes no se registraban.
function normalizeEntry(entry) {
  const powers = Array.isArray(entry.powers) ? entry.powers : [entry.hybridId];
  const basicSignId = isSign(entry.basicSignId) ? entry.basicSignId : entry.signId;
  const element = Object.hasOwn(ALL_ELEMENTS, entry.element) ? entry.element
    : (Object.hasOwn(POWER_BY_ID, entry.hybridId) ? entry.hybridId : ZODIAC_BY_ID[entry.signId]?.element);
  return {
    ...entry, basicSignId, element, powers: [...new Set(powers.filter((id) => Object.hasOwn(POWER_BY_ID, id)))],
    power: entry.power ?? ZODIAC_BY_ID[basicSignId]?.spell.name,
    bosses: Array.isArray(entry.bosses) ? entry.bosses.filter((boss) =>
      boss && isSign(boss.signId) && Object.hasOwn(ALL_ELEMENTS, boss.element)) : [],
  };
}

// Cada escritura es un único reemplazo en localStorage. El estado en memoria
// sigue operativo si el navegador deniega la API o se queda sin espacio.
export class SaveSystem {
  constructor(storage) {
    this.storage = storage;
    this.canPersist = Boolean(storage);
    this.progress = initialProgress();
    this.read();
  }

  read() {
    let raw;
    try {
      raw = this.storage?.getItem(storageKey);
    } catch {
      this.canPersist = false;
      return;
    }
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (![1, 2, version].includes(saved?.version)) return;
      const signs = Array.isArray(saved.unlockedSigns) ? saved.unlockedSigns.filter(isSign) : [];
      const zones = Array.isArray(saved.unlockedZones) ? saved.unlockedZones.filter((id) => Object.hasOwn(POWER_BY_ID, id)) : [];
      const lineage = Array.isArray(saved.lineage) ? saved.lineage.filter(validEntry).map(normalizeEntry) : [];
      this.progress = {
        version,
        unlockedSigns: [...new Set([...STARTER_SIGN_IDS, ...signs])],
        unlockedZones: [...new Set(zones)],
        lineage,
        history: Array.isArray(saved.history) ? saved.history.filter((saga) => Array.isArray(saga?.runs))
          .map((saga) => ({ ...saga, runs: saga.runs.filter(validEntry).map(normalizeEntry) })) : [],
        pendingAncestor: isSign(saved.pendingAncestor) ? saved.pendingAncestor : null,
      };
    } catch {
      // Si se dañó el JSON se conservan los valores iniciales. La siguiente
      // escritura puede recuperar la partida porque el almacén sí responde.
    }
  }

  write() {
    try {
      this.storage?.setItem(storageKey, JSON.stringify(this.progress));
    } catch {
      this.canPersist = false;
    }
  }

  unlockSign(signId) {
    if (!isSign(signId) || this.progress.unlockedSigns.includes(signId)) return false;
    this.progress.unlockedSigns.push(signId);
    this.write();
    return true;
  }

  unlockZone(zoneId) {
    if (!Object.hasOwn(POWER_BY_ID, zoneId) || this.progress.unlockedZones.includes(zoneId)) return false;
    this.progress.unlockedZones.push(zoneId);
    this.write();
    return true;
  }

  get ancestor() {
    return this.progress.lineage.at(-1) ?? null;
  }

  completeRun({ build, outcome, floors, bosses = [] }) {
    const { signId, parentSignId, aspectId, hybridId, element, powers, basicSignId, spell } = build;
    const entry = normalizeEntry({
      signId, parentSignId, aspectId, hybridId, element, powers, basicSignId,
      power: spell.name, outcome, floors, bosses, date: new Date().toISOString(),
    });
    if (!validEntry(entry)) throw new RangeError('Invalid lineage entry');
    this.progress.lineage.push(entry);
    this.progress.pendingAncestor = signId;
    this.write();
  }

  resetSaga() {
    const { lineage, history } = this.progress;
    if (!lineage.length) return false;
    this.progress = initialProgress();
    this.progress.history = [...history, { date: new Date().toISOString(), runs: lineage }];
    this.write();
    return true;
  }
}

function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export const saveSystem = new SaveSystem(browserStorage());
