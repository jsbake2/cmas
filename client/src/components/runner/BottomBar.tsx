import { useSessionStore } from "@/store/session";
import type { Item } from "@/content/schema";
import { isItemAnswered } from "@/lib/scoring";
import type { FlatItem } from "./types";

interface Props {
  flat: FlatItem[];
  current: number;
  items: Map<string, Item>;
  onChange: (i: number) => void;
  onReview: () => void;
}

export default function BottomBar({
  flat,
  current,
  items,
  onChange,
  onReview,
}: Props) {
  const session = useSessionStore();
  const cur = flat[current];
  const item = items.get(cur.itemId);
  const flagged = !!session.state?.flags[cur.itemId];

  return (
    <div className="border-t border-border bg-paper px-4 py-2 flex items-center gap-3">
      <button
        className="btn"
        disabled={current === 0}
        onClick={() => onChange(current - 1)}
      >
        ← Back
      </button>
      <div className="text-sm font-ui text-muted">
        Item {current + 1} of {flat.length}
      </div>
      <button
        className="btn"
        aria-pressed={flagged}
        onClick={() => session.toggleFlag(cur.itemId)}
        style={
          flagged
            ? {
                background: "var(--color-accent-soft)",
                borderColor: "var(--color-accent)",
                color: "var(--color-accent)",
              }
            : {}
        }
      >
        {flagged ? "⚑ Flagged" : "⚐ Flag"}
      </button>
      <div className="flex-1 overflow-x-auto">
        <div className="item-nav-strip">
          {flat.map((f, i) => {
            const it = items.get(f.itemId);
            const ans = it
              ? isItemAnswered(it, session.state?.responses[f.itemId])
              : false;
            const flag = !!session.state?.flags[f.itemId];
            return (
              <button
                key={f.itemId}
                data-status={ans ? "answered" : "unanswered"}
                data-current={i === current ? "true" : "false"}
                data-flagged={flag ? "true" : "false"}
                onClick={() => onChange(i)}
                aria-label={`Go to item ${i + 1}${ans ? ", answered" : ""}${
                  flag ? ", flagged" : ""
                }`}
                aria-current={i === current ? "true" : undefined}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
      <button className="btn" onClick={onReview}>
        Review
      </button>
      <button
        className="btn btn-primary"
        disabled={current === flat.length - 1}
        onClick={() => onChange(current + 1)}
      >
        Next →
      </button>
    </div>
  );
}
