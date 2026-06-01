import type { Item } from "@/content/schema";
import { useSessionStore } from "@/store/session";
import { useSettingsStore } from "@/store/settings";

interface Props {
  item: Extract<Item, { type: "short_response" }>;
}

export default function ShortResponse({ item }: Props) {
  const session = useSessionStore();
  const settings = useSettingsStore();
  const r = (session.state?.responses[item.id] as string | undefined) ?? "";

  return (
    <div>
      <h3 className="font-ui text-lg mb-3">{item.stem}</h3>
      {item.requireCitation && (
        <p className="text-sm text-muted mb-3">
          Use at least one detail from the passage and name the paragraph it
          comes from.
        </p>
      )}
      <textarea
        className="w-full min-h-40 p-3 border border-border rounded bg-paper text-ink font-ui"
        value={r}
        spellCheck={settings.spellCheck}
        onChange={(e) => session.setResponse(item.id, e.target.value)}
        placeholder="Write your answer here…"
      />
      <div className="text-xs text-muted mt-1">
        Worth {item.rubricMax} points. Scored by a parent after submission.
      </div>
    </div>
  );
}
