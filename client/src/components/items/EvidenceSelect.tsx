import type { Item } from "@/content/schema";
import { useSessionStore } from "@/store/session";

interface Props {
  item: Extract<Item, { type: "evidence_select" }>;
}

export default function EvidenceSelect({ item }: Props) {
  const session = useSessionStore();
  const r = (session.state?.responses[item.id] as string[] | undefined) ?? [];

  return (
    <div>
      <h3 className="font-ui text-lg mb-3">{item.stem}</h3>

      <div
        className="card mb-4"
        style={{
          background: "var(--color-accent-soft)",
          borderColor: "var(--color-accent)",
        }}
      >
        <div className="font-ui font-semibold text-sm mb-1">
          How to answer
        </div>
        <ol className="list-decimal pl-5 text-sm space-y-1">
          <li>
            Look in the passage on the left
            {item.paragraphScope != null && (
              <>
                {" "}
                at <strong>paragraph {item.paragraphScope}</strong> (it's
                highlighted with a blue bar)
              </>
            )}
            .
          </li>
          <li>
            Each sentence you can pick has a dotted blue underline. Click
            one to choose it. Click again to unchoose.
          </li>
        </ol>
      </div>

      <div className="card">
        <div className="text-xs text-muted font-ui mb-1">Your selection</div>
        {r.length === 0 ? (
          <em className="text-muted">
            No sentence chosen yet — click one on the left.
          </em>
        ) : (
          <ul className="list-disc pl-5 space-y-1">
            {r.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
        {r.length > 0 && (
          <button
            className="btn mt-3"
            onClick={() => session.setResponse(item.id, [])}
          >
            Clear selection
          </button>
        )}
      </div>
    </div>
  );
}
