/**
 * Every function here works in the device's LOCAL time.
 *
 * Entries are stored as ISO/UTC instants, which is correct — an instant is
 * unambiguous. But "how many did I have today" is a local-time question. Slice
 * an ISO string to get the date and anything logged between local midnight and
 * the UTC offset lands on the wrong day. So: parse to a Date, then use
 * getFullYear/getMonth/getDate.
 */

export const PERIODS = ['day', 'week', 'month', 'year'];

const WEEK_STARTS_ON = 1; // Monday

export function startOf(period, date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (period === 'week') {
    const diff = (d.getDay() - WEEK_STARTS_ON + 7) % 7;
    d.setDate(d.getDate() - diff);
  } else if (period === 'month') {
    d.setDate(1);
  } else if (period === 'year') {
    d.setMonth(0, 1);
  }
  return d;
}

/** Exclusive upper bound — the first instant of the next period. */
export function endOf(period, date) {
  const d = startOf(period, date);
  if (period === 'day') d.setDate(d.getDate() + 1);
  else if (period === 'week') d.setDate(d.getDate() + 7);
  else if (period === 'month') d.setMonth(d.getMonth() + 1);
  else if (period === 'year') d.setFullYear(d.getFullYear() + 1);
  return d;
}

export function shift(period, date, delta) {
  const d = startOf(period, date);
  if (period === 'day') d.setDate(d.getDate() + delta);
  else if (period === 'week') d.setDate(d.getDate() + delta * 7);
  else if (period === 'month') d.setMonth(d.getMonth() + delta);
  else if (period === 'year') d.setFullYear(d.getFullYear() + delta);
  return d;
}

export function isSamePeriod(period, a, b) {
  return startOf(period, a).getTime() === startOf(period, b).getTime();
}

/** 'YYYY-MM-DD' built from local parts, safe as an object key. */
export function dayKey(date) {
  const d = new Date(date);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function eachDay(start, end) {
  const days = [];
  const d = new Date(start);
  while (d < end) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

const fmt = (opts) => new Intl.DateTimeFormat(undefined, opts);

export function periodLabel(period, date) {
  const start = startOf(period, date);
  const today = new Date();

  if (period === 'day') {
    if (isSamePeriod('day', start, today)) return 'Today';
    if (isSamePeriod('day', start, shift('day', today, -1))) return 'Yesterday';
    return fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(start);
  }
  if (period === 'week') {
    const last = new Date(endOf('week', start));
    last.setDate(last.getDate() - 1);
    if (isSamePeriod('week', start, today)) return 'This week';
    const sameMonth = start.getMonth() === last.getMonth();
    const a = fmt({ day: 'numeric', month: sameMonth ? undefined : 'short' }).format(start);
    const b = fmt({ day: 'numeric', month: 'short' }).format(last);
    return `${a} – ${b}`;
  }
  if (period === 'month') {
    if (isSamePeriod('month', start, today)) return 'This month';
    return fmt({ month: 'long', year: 'numeric' }).format(start);
  }
  if (isSamePeriod('year', start, today)) return 'This year';
  return String(start.getFullYear());
}

export function timeLabel(iso) {
  return fmt({ hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function weekdayLabel(date) {
  return fmt({ weekday: 'short' }).format(date);
}

/** Entries falling inside [start, end), oldest first. */
export function entriesInRange(entries, start, end) {
  const lo = start.getTime();
  const hi = end.getTime();
  return entries
    .filter((e) => {
      const t = new Date(e.at).getTime();
      return t >= lo && t < hi;
    })
    .sort((a, b) => new Date(a.at) - new Date(b.at));
}
