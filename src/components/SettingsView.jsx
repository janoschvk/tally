import { useRef, useState } from 'react';
import { PALETTE } from '../storage.js';

const CONFIRM_REPLACE = 'Replace ALL data on this device with the file you pick? This deletes anything logged here first. Cannot be undone.';

export default function SettingsView({
  items,
  entryCount,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onExport,
  onImport,
  onClearAll,
}) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(PALETTE[0].value);
  const fileRef = useRef(null);
  const modeRef = useRef('merge');

  function pickFile(mode) {
    if (mode === 'replace' && !confirm(CONFIRM_REPLACE)) return;
    modeRef.current = mode;
    fileRef.current?.click();
  }

  function submit() {
    if (!label.trim()) return;
    onAddItem({ label, color });
    setLabel('');
  }

  return (
    <div className="settings">
      <h2 className="section">What you track</h2>
      <ul className="items">
        {items.map((item) => (
          <li className="item" key={item.id} style={{ '--accent': item.color }}>
            <input
              className="item__name"
              value={item.label}
              onChange={(e) => onUpdateItem(item.id, { label: e.target.value })}
              aria-label="Name"
            />
            <div className="swatches">
              {PALETTE.map((p) => (
                <button
                  key={p.value}
                  className={p.value === item.color ? 'swatch is-on' : 'swatch'}
                  style={{ background: p.value }}
                  onClick={() => onUpdateItem(item.id, { color: p.value })}
                  aria-label={p.name}
                />
              ))}
            </div>
            <button
              className="item__del"
              onClick={() => onRemoveItem(item.id, item.label)}
              aria-label={`Remove ${item.label}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="add">
        <input
          className="add__input"
          placeholder="Espresso, sugar, screen hours…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <div className="swatches">
          {PALETTE.map((p) => (
            <button
              key={p.value}
              className={p.value === color ? 'swatch is-on' : 'swatch'}
              style={{ background: p.value }}
              onClick={() => setColor(p.value)}
              aria-label={p.name}
            />
          ))}
        </div>
        <button className="btn btn--primary" onClick={submit} disabled={!label.trim()}>
          Add
        </button>
      </div>

      <h2 className="section">Your data</h2>
      <p className="note">
        {entryCount} {entryCount === 1 ? 'entry' : 'entries'} live in this browser on this device
        only. Nothing is uploaded anywhere. If you clear site data or switch phones, it goes with
        it — so export a backup now and then.
      </p>
      <div className="row">
        <button className="btn" onClick={onExport}>
          Export backup
        </button>
        <button className="btn" onClick={() => pickFile('merge')}>
          Import (merge)
        </button>
        <button className="btn" onClick={() => pickFile('replace')}>
          Import (replace)
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f, modeRef.current);
            e.target.value = '';
          }}
        />
      </div>
      <p className="note">
        <strong>Merge</strong> adds the file's entries on top of what's already here — items
        with matching names are reused rather than duplicated. <strong>Replace</strong> wipes
        this device first. Merge is what you want almost always.
      </p>
      <button className="btn btn--danger" onClick={onClearAll}>
        Delete everything
      </button>
    </div>
  );
}
