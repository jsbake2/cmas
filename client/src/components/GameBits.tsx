/** Small shared presentational bits for the Reading Quest chrome. */

export function StarIcon({ on }: { on: boolean }) {
  return (
    <svg
      className={"star " + (on ? "on" : "off")}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 2 L14.7 8.6 L21.8 9.2 L16.4 13.9 L18.1 20.8 L12 17.1 L5.9 20.8 L7.6 13.9 L2.2 9.2 L9.3 8.6 Z" />
    </svg>
  );
}

export function Stars({
  n,
  max = 3,
  animate = false,
}: {
  n: number;
  max?: number;
  animate?: boolean;
}) {
  return (
    <span className="stars" aria-label={`${n} of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          style={
            animate
              ? { animation: `pop-in 380ms ${300 + i * 220}ms both` }
              : undefined
          }
        >
          <StarIcon on={i < n} />
        </span>
      ))}
    </span>
  );
}

const CONFETTI_COLORS = [
  "var(--gold)",
  "var(--orange)",
  "var(--purple)",
  "var(--green)",
  "var(--blue)",
  "var(--pink)",
];

export function Confetti({ count = 90 }: { count?: number }) {
  const pieces = Array.from({ length: count }).map((_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.6;
    const dur = 1.8 + Math.random() * 1.6;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const w = 7 + Math.random() * 8;
    return (
      <i
        key={i}
        style={{
          left: left + "vw",
          background: color,
          width: w + "px",
          height: w * 1.4 + "px",
          animationDelay: delay + "s",
          animationDuration: dur + "s",
          borderRadius: Math.random() > 0.5 ? "50%" : "3px",
        }}
      />
    );
  });
  return (
    <div className="confetti" aria-hidden="true">
      {pieces}
    </div>
  );
}
