/**
 * Counts drawn the way you'd actually scratch them on a beer mat:
 * four uprights and a slash through them. Groups of five, so you read the
 * number by shape rather than by digit.
 */

// Deterministic wobble — same stroke always leans the same way, so marks don't
// twitch on every re-render.
function wobble(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1; // -1 .. 1
}

const GROUP_W = 34;
const GROUP_H = 30;

function Group({ marks, color, offset, animateLast }) {
  const strokes = [];
  for (let i = 0; i < Math.min(marks, 4); i++) {
    const w = wobble(offset + i);
    strokes.push(
      <line
        key={i}
        x1={4 + i * 7 + w * 0.9}
        y1={4}
        x2={4 + i * 7 - w * 0.9}
        y2={26}
        className={animateLast && i === marks - 1 ? 'stroke stroke--new' : 'stroke'}
      />
    );
  }
  if (marks === 5) {
    strokes.push(
      <line
        key="slash"
        x1={0.5}
        y1={24}
        x2={28}
        y2={5}
        className={animateLast ? 'stroke stroke--new' : 'stroke'}
      />
    );
  }
  return (
    <svg
      className="tally-group"
      width={GROUP_W}
      height={GROUP_H}
      viewBox={`0 0 ${GROUP_W} ${GROUP_H}`}
      aria-hidden="true"
      style={{ color }}
    >
      {strokes}
    </svg>
  );
}

export default function Tally({ count, color, limit = 40 }) {
  if (count === 0) {
    return <span className="tally-empty">none yet</span>;
  }

  if (count > limit) {
    return (
      <span className="tally-numeral" style={{ color }}>
        {count}
      </span>
    );
  }

  const full = Math.floor(count / 5);
  const rest = count % 5;
  const groups = [];
  for (let g = 0; g < full; g++) groups.push(5);
  if (rest) groups.push(rest);

  return (
    <span className="tally" role="img" aria-label={`${count}`}>
      {groups.map((marks, gi) => (
        <Group
          key={gi}
          marks={marks}
          color={color}
          offset={gi * 5}
          animateLast={gi === groups.length - 1}
        />
      ))}
    </span>
  );
}
