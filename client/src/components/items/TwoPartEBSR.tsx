import type { Item } from "@/content/schema";
import { useSessionStore } from "@/store/session";

interface Props {
  item: Extract<Item, { type: "two_part_ebsr" }>;
}

export default function TwoPartEBSR({ item }: Props) {
  const session = useSessionStore();
  const r = (session.state?.responses[item.id] as
    | { partA?: string; partB?: string }
    | undefined) ?? {};

  function set(part: "partA" | "partB", value: string) {
    session.setResponse(item.id, { ...r, [part]: value });
  }

  return (
    <div className="space-y-6">
      <Part
        label="Part A"
        stem={item.partA.stem}
        options={item.partA.options}
        value={r.partA}
        onChange={(v) => set("partA", v)}
      />
      <Part
        label="Part B"
        stem={item.partB.stem}
        options={item.partB.options}
        value={r.partB}
        onChange={(v) => set("partB", v)}
      />
    </div>
  );
}

function Part({
  label,
  stem,
  options,
  value,
  onChange,
}: {
  label: string;
  stem: string;
  options: Array<{ id: string; text: string }>;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="card">
      <div className="text-xs text-muted font-ui font-semibold uppercase tracking-wide">
        {label}
      </div>
      <h3 className="font-ui text-lg mt-1 mb-3">{stem}</h3>
      <ul className="space-y-2">
        {options.map((opt) => {
          const isOn = value === opt.id;
          return (
            <li key={opt.id}>
              <label
                className={
                  "flex items-start gap-3 cursor-pointer p-2 rounded " +
                  (isOn ? "" : "hover:bg-accentSoft")
                }
                style={
                  isOn
                    ? {
                        background: "var(--color-accent-soft)",
                        outline: "2px solid var(--color-accent)",
                      }
                    : {}
                }
              >
                <input
                  type="radio"
                  name={label}
                  checked={isOn}
                  onChange={() => onChange(opt.id)}
                  className="mt-1"
                />
                <span>
                  <strong>{opt.id}.</strong> {opt.text}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
