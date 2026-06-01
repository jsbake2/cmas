import type { Item } from "@/content/schema";
import { useSessionStore } from "@/store/session";
import { useSettingsStore } from "@/store/settings";

interface Props {
  item: Extract<Item, { type: "prose_response" }>;
}

const TASK_LABEL: Record<
  Extract<Item, { type: "prose_response" }>["taskType"],
  string
> = {
  narrative: "Narrative",
  research_simulation: "Research simulation",
  literary_analysis: "Literary analysis",
};

export default function ProseResponse({ item }: Props) {
  const session = useSessionStore();
  const settings = useSettingsStore();
  const r = (session.state?.responses[item.id] as string | undefined) ?? "";
  const words = r.trim() ? r.trim().split(/\s+/).length : 0;

  return (
    <div>
      <div className="text-xs text-muted font-ui mb-1">
        {TASK_LABEL[item.taskType]}
      </div>
      <h3 className="font-ui text-lg mb-3">{item.stem}</h3>
      {item.requireCitation && (
        <p className="text-sm text-muted mb-2">
          Use details from the passage(s) and name the paragraph each detail
          comes from.
        </p>
      )}
      {item.wordCountHint != null && (
        <p className="text-sm text-muted mb-3">
          About {item.wordCountHint} words.
        </p>
      )}
      <textarea
        className="w-full min-h-[24rem] p-3 border border-border rounded bg-paper text-ink font-ui leading-relaxed"
        value={r}
        spellCheck={settings.spellCheck}
        onChange={(e) => session.setResponse(item.id, e.target.value)}
        placeholder="Plan, then write your response here…"
      />
      <div className="text-xs text-muted mt-1 flex justify-between">
        <span>
          Worth {item.rubricMax} points. Scored by a parent after submission.
        </span>
        <span>{words} words</span>
      </div>
    </div>
  );
}
