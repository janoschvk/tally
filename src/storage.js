/**
 * The only file in this app that knows where data lives.
 *
 * Every component calls these functions and never touches localStorage
 * directly. If you later move to a real backend, you rewrite this file and
 * nothing else — with one caveat: these functions are synchronous because
 * localStorage is. A network backend forces them to become async, which does
 * ripple outward into components. That is the price of starting sync, and it
 * is the right price for a single-device tracker.
 */

const KEY_ITEMS = 'tally:v1:items';
const KEY_ENTRIES = 'tally:v1:entries';

export const PALETTE = [
  { name: 'ember', value: '#E2653F' },
  { name: 'wine', value: '#A8324F' },
  { name: 'sage', value: '#6E9E7B' },
  { name: 'brass', value: '#C8A24A' },
  { name: 'sky', value: '#4E82B4' },
  { name: 'violet', value: '#8874BE' },
];

const DEFAULT_ITEMS = [
  { id: 'cigarettes', label: 'Cigarettes', color: '#E2653F' },
  { id: 'white-wine', label: 'White wine', color: '#C8A24A' },
  { id: 'meat', label: 'Meat', color: '#A8324F' },
];

const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    // Corrupt or unreadable (private mode, quota, hand-edited). Don't crash
    // the app over it — fall back and let the user re-import a backup.
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ---------- items (the things you track) ---------- */

export function getItems() {
  const items = read(KEY_ITEMS, null);
  if (!items) {
    write(KEY_ITEMS, DEFAULT_ITEMS);
    return DEFAULT_ITEMS;
  }
  return items;
}

export function saveItems(items) {
  write(KEY_ITEMS, items);
  return items;
}

export function addItem({ label, color }) {
  const items = getItems();
  const next = [...items, { id: uid(), label: label.trim(), color }];
  return saveItems(next);
}

export function updateItem(id, patch) {
  return saveItems(getItems().map((i) => (i.id === id ? { ...i, ...patch } : i)));
}

/** Removes the item and every entry belonging to it. */
export function removeItem(id) {
  saveItems(getItems().filter((i) => i.id !== id));
  write(KEY_ENTRIES, getEntries().filter((e) => e.itemId !== id));
  return getItems();
}

/* ---------- entries (one row per event) ---------- */

export function getEntries() {
  return read(KEY_ENTRIES, []);
}

/**
 * `at` is an ISO instant (UTC). Always bucket it with the local-time helpers
 * in dates.js — never by slicing the string, or anything logged after
 * midnight local time lands on the wrong day.
 *
 * `note` is optional and free text — who you were with, where, why. The tap
 * itself stays instant; the note is something you attach right after, or
 * later from History, never something that blocks the log.
 */
export function addEntry(itemId, at = new Date(), note = '') {
  const entries = getEntries();
  const entry = { id: uid(), itemId, at: at.toISOString(), note: note.trim() };
  write(KEY_ENTRIES, [...entries, entry]);
  return entry;
}

export function updateEntry(entryId, patch) {
  const next = getEntries().map((e) => (e.id === entryId ? { ...e, ...patch } : e));
  write(KEY_ENTRIES, next);
  return next;
}

export function removeEntry(entryId) {
  const next = getEntries().filter((e) => e.id !== entryId);
  write(KEY_ENTRIES, next);
  return next;
}

/** The most recent entry logged for an item, or null. */
export function getLastEntry(itemId) {
  const entries = getEntries();
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].itemId === itemId) return entries[i];
  }
  return null;
}

/** Undo: drops the most recent entry for an item. Returns true if one went. */
export function removeLastEntry(itemId) {
  const entries = getEntries();
  let lastIndex = -1;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].itemId === itemId) {
      lastIndex = i;
      break;
    }
  }
  if (lastIndex === -1) return false;
  const next = entries.slice();
  next.splice(lastIndex, 1);
  write(KEY_ENTRIES, next);
  return true;
}

/* ---------- backup ---------- */

export function exportData() {
  return {
    format: 'tally',
    version: 1,
    exportedAt: new Date().toISOString(),
    items: getItems(),
    entries: getEntries(),
  };
}

const normalize = (label) => label.trim().toLowerCase();

/**
 * mode: 'replace' wipes current data and installs the backup verbatim — use
 * for restoring a full backup onto a fresh install.
 *
 * mode: 'merge' keeps everything already on this device and adds the backup
 * on top. Items are matched by label (case-insensitive): if you already have
 * "White wine", the backup's "White wine" entries are pointed at your
 * existing item rather than creating a duplicate. Anything with no local
 * match (e.g. "Weed", if you haven't added it yet) is created automatically.
 * Every imported entry gets a fresh id, so importing the same backup twice
 * is safe to do by accident but will duplicate the entries — it's a merge,
 * not a dedupe.
 */
export function importData(payload, mode = 'replace') {
  if (!payload || payload.format !== 'tally' || !Array.isArray(payload.entries)) {
    throw new Error('Not a Tally backup file.');
  }

  if (mode === 'replace') {
    write(KEY_ITEMS, payload.items ?? DEFAULT_ITEMS);
    write(KEY_ENTRIES, payload.entries);
    return;
  }

  const existingItems = getItems();
  const byLabel = new Map(existingItems.map((i) => [normalize(i.label), i]));
  const idMap = new Map(); // backup item id -> local item id
  const mergedItems = existingItems.slice();

  for (const src of payload.items ?? []) {
    const match = byLabel.get(normalize(src.label));
    if (match) {
      idMap.set(src.id, match.id);
    } else {
      const created = { id: uid(), label: src.label, color: src.color ?? PALETTE[0].value };
      mergedItems.push(created);
      byLabel.set(normalize(created.label), created);
      idMap.set(src.id, created.id);
    }
  }

  const importedEntries = payload.entries.map((e) => ({
    id: uid(),
    itemId: idMap.get(e.itemId) ?? e.itemId,
    at: e.at,
    note: e.note ?? '',
  }));

  saveItems(mergedItems);
  write(KEY_ENTRIES, [...getEntries(), ...importedEntries]);
}

export function clearAll() {
  localStorage.removeItem(KEY_ITEMS);
  localStorage.removeItem(KEY_ENTRIES);
}
