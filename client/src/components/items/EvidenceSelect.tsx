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

      <p className="text-sm text-muted mb-4">
        {item.paragraphScope != null ? (
          <>
            Read <strong>paragraph {item.paragraphScope}</strong> in the
            passage on the left, then click the sentence that best answers
            the question. Click again to unchoose.
          </>
        ) : (
          <>
            Read the passage on the left, then click the sentence that best
            answers the question. Click again to unchoose.
          </>
        )}
      </p>

      <div className="card">
        <div className="text-xs text-muted font-ui mb-1">Your selection</div>
        {r.length === 0 ? (
          <em className="text-muted">No sentence chosen yet.</em>
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
