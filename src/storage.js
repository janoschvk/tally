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
 */
export function addEntry(itemId, at = new Date()) {
  const entries = getEntries();
  const entry = { id: uid(), itemId, at: at.toISOString() };
  write(KEY_ENTRIES, [...entries, entry]);
  return entry;
}

export function removeEntry(entryId) {
  const next = getEntries().filter((e) => e.id !== entryId);
  write(KEY_ENTRIES, next);
  return next;
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

/** Replaces everything. Throws on a payload it doesn't recognise. */
export function importData(payload) {
  if (!payload || payload.format !== 'tally' || !Array.isArray(payload.entries)) {
    throw new Error('Not a Tally backup file.');
  }
  write(KEY_ITEMS, payload.items ?? DEFAULT_ITEMS);
  write(KEY_ENTRIES, payload.entries);
}

export function clearAll() {
  localStorage.removeItem(KEY_ITEMS);
  localStorage.removeItem(KEY_ENTRIES);
}
