import type { Item } from "@/content/schema";
import { useSessionStore } from "@/store/session";

interface Props {
  item: Extract<Item, { type: "multiple_choice" }>;
}

export default function MultipleChoice({ item }: Props) {
  const session = useSessionStore();
  const r = (session.state?.responses[item.id] as string | undefined) ?? null;
  const eliminated = new Set(session.state?.eliminated[item.id] ?? []);
  const masked = session.state?.masked[item.id] ?? false;

  return (
    <div>
      <h3 className="font-ui text-lg mb-4">{item.stem}</h3>
      <ul className="space-y-2">
        {item.options.map((opt) => {
          const isOn = r === opt.id;
          const isElim = eliminated.has(opt.id);
          const isMasked = masked;
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
                  type="radio"
                  name={item.id}
                  checked={isOn}
                  disabled={isElim}
                  onChange={() => session.setResponse(item.id, opt.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold">{opt.id}.</span>
                    <span>{isMasked ? "•••••" : opt.text}</span>
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
                  title={isElim ? "Restore" : "Cross out"}
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
