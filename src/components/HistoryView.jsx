import { useMemo, useState } from 'react';
import {
  PERIODS,
  startOf,
  endOf,
  shift,
  isSamePeriod,
  entriesInRange,
  periodLabel,
  dayKey,
  eachDay,
  weekdayLabel,
  timeLabel,
} from '../dates.js';

function LogRow({ entry, item, onRemove, onNote }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.note ?? '');

  function save() {
    onNote(entry.id, draft);
    setEditing(false);
  }

  return (
    <li className="log__row" style={{ '--accent': item?.color ?? '#7C8794' }}>
      <div className="log__main">
        <span className="log__dot" />
        <span className="log__label">{item?.label ?? 'Removed'}</span>
        <span className="log__time">{timeLabel(entry.at)}</span>
        <button className="log__del" onClick={() => onRemove(entry.id)} aria-label="Delete entry">
          ×
        </button>
      </div>
      {editing ? (
        <div className="log__noteedit">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="who, where, why…"
          />
          <button className="log__notesave" onClick={save}>
            Save
          </button>
        </div>
      ) : (
        <button className="log__note" onClick={() => setEditing(true)}>
          {entry.note ? entry.note : '+ add note'}
        </button>
      )}
    </li>
  );
}

export default function HistoryView({ items, entries, onRemoveEntry, onNoteEntry }) {
  const [period, setPeriod] = useState('week');
  const [anchor, setAnchor] = useState(() => new Date());

  const start = useMemo(() => startOf(period, anchor), [period, anchor]);
  const end = useMemo(() => endOf(period, anchor), [period, anchor]);
  const inRange = useMemo(() => entriesInRange(entries, start, end), [entries, start, end]);

  const byItem = useMemo(() => {
    const c = {};
    for (const e of inRange) c[e.itemId] = (c[e.itemId] ?? 0) + 1;
    return c;
  }, [inRange]);

  const peak = Math.max(1, ...items.map((i) => byItem[i.id] ?? 0));
  const atPresent = isSamePeriod(period, anchor, new Date());
  const days = period === 'day' ? [] : eachDay(start, end);

  // Per-day totals, for the strip under the summary.
  const dayTotals = useMemo(() => {
    const m = {};
    for (const e of inRange) {
      const k = dayKey(e.at);
      m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  }, [inRange]);
  const dayPeak = Math.max(1, ...Object.values(dayTotals));

  return (
    <div className="history">
      <div className="segmented" role="tablist">
        {PERIODS.map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={p === period}
            className={p === period ? 'segmented__btn is-active' : 'segmented__btn'}
            onClick={() => setPeriod(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="pager">
        <button className="pager__arrow" onClick={() => setAnchor(shift(period, anchor, -1))} aria-label="Previous">
          ‹
        </button>
        <span className="pager__label">{periodLabel(period, anchor)}</span>
        <button
          className="pager__arrow"
          onClick={() => setAnchor(shift(period, anchor, 1))}
          disabled={atPresent}
          aria-label="Next"
        >
          ›
        </button>
      </div>

      <p className="history__total">
        <span className="history__total-num">{inRange.length}</span>
        {inRange.length === 1 ? ' entry' : ' entries'}
      </p>

      <ul className="totals">
        {items.map((item) => {
          const n = byItem[item.id] ?? 0;
          return (
            <li className="total" key={item.id} style={{ '--accent': item.color }}>
              <span className="total__label">{item.label}</span>
              <span className="total__bar">
                <span className="total__fill" style={{ width: `${(n / peak) * 100}%` }} />
              </span>
              <span className="total__num">{n}</span>
            </li>
          );
        })}
      </ul>

      {days.length > 1 && days.length <= 62 && (
        <div className="strip">
          {days.map((d) => {
            const n = dayTotals[dayKey(d)] ?? 0;
            return (
              <div className="strip__col" key={dayKey(d)} title={`${dayKey(d)}: ${n}`}>
                <span className="strip__bar" style={{ height: `${(n / dayPeak) * 100}%` }} />
                {days.length <= 31 && (
                  <span className="strip__tick">
                    {period === 'week' ? weekdayLabel(d).slice(0, 1) : d.getDate()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {period === 'day' && (
        <ul className="log">
          {inRange.length === 0 && <li className="log__empty">Nothing logged.</li>}
          {[...inRange].reverse().map((e) => (
            <LogRow
              key={e.id}
              entry={e}
              item={items.find((i) => i.id === e.itemId)}
              onRemove={onRemoveEntry}
              onNote={onNoteEntry}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
