import { useMemo } from 'react';
import Tally from './Tally.jsx';
import { startOf, endOf, entriesInRange, timeLabel } from '../dates.js';

export default function TodayView({ items, entries, onLog, onUndo }) {
  const today = useMemo(() => {
    const now = new Date();
    return entriesInRange(entries, startOf('day', now), endOf('day', now));
  }, [entries]);

  const counts = useMemo(() => {
    const c = {};
    for (const e of today) c[e.itemId] = (c[e.itemId] ?? 0) + 1;
    return c;
  }, [today]);

  const lastAt = useMemo(() => {
    const m = {};
    for (const e of today) m[e.itemId] = e.at;
    return m;
  }, [today]);

  if (items.length === 0) {
    return (
      <div className="empty">
        <p>Nothing to count yet.</p>
        <p className="empty__hint">Add something to track in Settings.</p>
      </div>
    );
  }

  return (
    <div className="cards">
      {items.map((item) => {
        const count = counts[item.id] ?? 0;
        return (
          <div className="card" key={item.id} style={{ '--accent': item.color }}>
            <button
              className="card__log"
              onClick={() => onLog(item.id)}
              aria-label={`Log one ${item.label}. Currently ${count} today.`}
            >
              <span className="card__head">
                <span className="card__label">{item.label}</span>
                <span className="card__count">{count}</span>
              </span>
              <span className="card__marks">
                <Tally count={count} color={item.color} />
              </span>
            </button>

            <div className="card__foot">
              <span className="card__last">
                {count > 0 ? `last at ${timeLabel(lastAt[item.id])}` : 'tap to log'}
              </span>
              <button
                className="undo"
                onClick={() => onUndo(item.id)}
                disabled={count === 0}
              >
                Undo
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
