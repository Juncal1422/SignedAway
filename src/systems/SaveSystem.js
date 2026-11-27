import { STARTER_SIGN_IDS, ZODIAC_BY_ID } from '../data/zodiacData.js';
import { HYBRID_ELEMENTS } from '../data/astrologyTable.js';

const storageKey = 'signed-away.progress';
const version = 1;
const hybridIds = Object.values(HYBRID_ELEMENTS).map(({ id }) => id);

function initialProgress() {
  return { version, unlockedSigns: [...STARTER_SIGN_IDS], unlockedZones: [], lineage: [], pendingAncestor: null };
}

function isSign(id) {
  return typeof id === 'string' && Object.hasOwn(ZODIAC_BY_ID, id);
}

function validEntry(entry) {
  return entry && isSign(entry.signId) && ['defeat', 'victory'].includes(entry.outcome)
    && Number.isSafeInteger(entry.floors) && entry.floors >= 0;
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
      if (saved?.version !== version) return;
      const signs = Array.isArray(saved.unlockedSigns) ? saved.unlockedSigns.filter(isSign) : [];
      const zones = Array.isArray(saved.unlockedZones) ? saved.unlockedZones.filter((id) => hybridIds.includes(id)) : [];
      const lineage = Array.isArray(saved.lineage) ? saved.lineage.filter(validEntry) : [];
      this.progress = {
        version,
        unlockedSigns: [...new Set([...STARTER_SIGN_IDS, ...signs])],
        unlockedZones: [...new Set(zones)],
        lineage,
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
    if (!hybridIds.includes(zoneId) || this.progress.unlockedZones.includes(zoneId)) return false;
    this.progress.unlockedZones.push(zoneId);
    this.write();
    return true;
  }

  completeRun({ signId, parentSignId, aspectId, hybridId, outcome, floors }) {
    const entry = { signId, parentSignId, aspectId, hybridId, outcome, floors, date: new Date().toISOString() };
    if (!validEntry(entry)) throw new RangeError('Invalid lineage entry');
    this.progress.lineage.push(entry);
    this.progress.pendingAncestor = signId;
    this.write();
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
