import { useEffect, useState } from 'react';
import * as store from './storage.js';
import TodayView from './components/TodayView.jsx';
import HistoryView from './components/HistoryView.jsx';
import SettingsView from './components/SettingsView.jsx';

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  const [tab, setTab] = useState('today');
  const [items, setItems] = useState(() => store.getItems());
  const [entries, setEntries] = useState(() => store.getEntries());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Another tab of the same app changed storage — stay in sync.
  useEffect(() => {
    const onStorage = () => {
      setItems(store.getItems());
      setEntries(store.getEntries());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const refresh = () => {
    setItems(store.getItems());
    setEntries(store.getEntries());
  };

  function log(itemId) {
    store.addEntry(itemId);
    setEntries(store.getEntries());
    navigator.vibrate?.(8);
  }

  function undo(itemId) {
    if (store.removeLastEntry(itemId)) setEntries(store.getEntries());
  }

  function removeEntry(id) {
    setEntries(store.removeEntry(id));
  }

  function noteEntry(id, note) {
    setEntries(store.updateEntry(id, { note }));
  }

  function exportData() {
    const data = store.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tally-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast('Backup saved.');
  }

  async function importData(file, mode) {
    try {
      store.importData(JSON.parse(await file.text()), mode);
      refresh();
      setToast(mode === 'merge' ? 'Backup merged in.' : 'Backup restored.');
    } catch (err) {
      setToast(err.message || "That file isn't a Tally backup.");
    }
  }

  function clearAll() {
    if (!confirm('Delete every item and entry? Export a backup first if you want them.')) return;
    store.clearAll();
    refresh();
    setToast('All data deleted.');
  }

  function removeItem(id, label) {
    if (!confirm(`Remove "${label}" and every entry logged against it?`)) return;
    setItems(store.removeItem(id));
    setEntries(store.getEntries());
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="wordmark">Tally</h1>
        <p className="tagline">a private ledger</p>
      </header>

      <main className="main">
        {tab === 'today' && (
          <TodayView
            items={items}
            entries={entries}
            onLog={log}
            onUndo={undo}
            onNoteEntry={noteEntry}
          />
        )}
        {tab === 'history' && (
          <HistoryView
            items={items}
            entries={entries}
            onRemoveEntry={removeEntry}
            onNoteEntry={noteEntry}
          />
        )}
        {tab === 'settings' && (
          <SettingsView
            items={items}
            entryCount={entries.length}
            onAddItem={(v) => setItems(store.addItem(v))}
            onUpdateItem={(id, patch) => setItems(store.updateItem(id, patch))}
            onRemoveItem={removeItem}
            onExport={exportData}
            onImport={importData}
            onClearAll={clearAll}
          />
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab ? 'tabs__btn is-active' : 'tabs__btn'}
            onClick={() => setTab(t.id)}
            aria-current={t.id === tab ? 'page' : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
