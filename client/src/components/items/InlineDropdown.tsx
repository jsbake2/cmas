import type { Item } from "@/content/schema";
import { useSessionStore } from "@/store/session";

interface Props {
  item: Extract<Item, { type: "inline_dropdown" }>;
}

export default function InlineDropdown({ item }: Props) {
  const session = useSessionStore();
  const r = (session.state?.responses[item.id] as
    | Record<string, string>
    | undefined) ?? {};

  // Split stem by {{blankId}} tokens and inject <select>s in place.
  const parts: Array<{ kind: "text" | "blank"; value: string }> = [];
  const regex = /\{\{(\w+)\}\}/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(item.stem)) != null) {
    parts.push({ kind: "text", value: item.stem.slice(lastIdx, m.index) });
    parts.push({ kind: "blank", value: m[1] });
    lastIdx = m.index + m[0].length;
  }
  parts.push({ kind: "text", value: item.stem.slice(lastIdx) });

  return (
    <div>
      <h3 className="font-ui text-lg mb-4">Choose the words that complete the sentence.</h3>
      <p className="text-base leading-relaxed">
        {parts.map((p, i) => {
          if (p.kind === "text") return <span key={i}>{p.value}</span>;
          const blank = item.blanks[p.value];
          if (!blank) return null;
          return (
            <select
              key={i}
              value={r[p.value] ?? ""}
              onChange={(e) =>
                session.setResponse(item.id, {
                  ...r,
                  [p.value]: e.target.value,
                })
              }
              className="mx-1 border border-border rounded px-2 py-0.5 bg-paper text-ink"
              aria-label={`Blank ${p.value}`}
            >
              <option value="">— pick one —</option>
              {blank.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.text}
                </option>
              ))}
            </select>
          );
        })}
      </p>
    </div>
  );
}
