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

export default function HistoryView({ items, entries, onRemoveEntry }) {
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
          {[...inRange].reverse().map((e) => {
            const item = items.find((i) => i.id === e.itemId);
            return (
              <li className="log__row" key={e.id} style={{ '--accent': item?.color ?? '#7C8794' }}>
                <span className="log__dot" />
                <span className="log__label">{item?.label ?? 'Removed'}</span>
                <span className="log__time">{timeLabel(e.at)}</span>
                <button className="log__del" onClick={() => onRemoveEntry(e.id)} aria-label="Delete entry">
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
