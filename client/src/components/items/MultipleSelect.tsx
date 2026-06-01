import type { Item } from "@/content/schema";
import { useSessionStore } from "@/store/session";

interface Props {
  item: Extract<Item, { type: "multiple_select" }>;
}

export default function MultipleSelect({ item }: Props) {
  const session = useSessionStore();
  const r = (session.state?.responses[item.id] as string[] | undefined) ?? [];
  const set = new Set(r);
  const eliminated = new Set(session.state?.eliminated[item.id] ?? []);
  const masked = session.state?.masked[item.id] ?? false;

  function toggle(id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    session.setResponse(item.id, [...next]);
  }

  return (
    <div>
      <h3 className="font-ui text-lg mb-4">{item.stem}</h3>
      <p className="text-sm text-muted mb-3">
        Select all that apply ({item.correct.length} answers).
      </p>
      <ul className="space-y-2">
        {item.options.map((opt) => {
          const isOn = set.has(opt.id);
          const isElim = eliminated.has(opt.id);
          return (
            <li key={opt.id}>
              <label
                className={
                  "card flex items-start gap-3 cursor-pointer " +
                  (isOn ? "border-accent " : "") +
                  (isElim ? "option-eliminated " : "")
                }
                style={isOn ? { borderColor: "var(--color-accent)" } : {}}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  disabled={isElim}
                  onChange={() => toggle(opt.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold">{opt.id}.</span>
                    <span>{masked ? "•••••" : opt.text}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs btn px-2 py-0.5"
                  onClick={(e) => {
                    e.preventDefault();
                    session.toggleEliminated(item.id, opt.id);
                  }}
                  aria-label={isElim ? "Restore choice" : "Cross out choice"}
                >
                  {isElim ? "↺" : "⊘"}
                </button>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
