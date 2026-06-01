import { useEffect, useState } from "react";
import { useToolsStore } from "@/store/tools";
import { useSettingsStore } from "@/store/settings";

const STEPS = [
  {
    title: "Welcome to your practice test",
    body:
      "This screen looks and works like the real digital test. We'll walk through what the tools do. You can re-open this tour anytime from the ? button.",
  },
  {
    title: "Passage on the left, question on the right",
    body:
      "Read the passage. The questions about it appear in the right panel. Use Back / Next to move between questions; you can revisit any of them before submitting.",
  },
  {
    title: "Highlighter",
    body:
      "Click the highlighter, pick a color, then drag across passage text to color it. Click a highlight to remove it. Your highlights stay on the passage as you move between its questions.",
  },
  {
    title: "Eliminator and answer masking",
    body:
      "On multiple-choice questions, the ⊘ icon on each choice crosses it out. The mask tool hides all the choices so they don't distract you; reveal them one at a time.",
  },
  {
    title: "Notepad and line reader",
    body:
      "The notepad keeps a sticky note for each passage. The line reader dims the page outside a moving band so you can focus on one line at a time.",
  },
  {
    title: "Flag and review",
    body:
      "Use the flag (⚑) to mark a question to come back to. The Review screen shows answered / unanswered / flagged questions and lets you jump anywhere before you Submit.",
  },
];

export default function Tutorial() {
  const open = useToolsStore((s) => s.tutorialOpen);
  const setOpen = useToolsStore((s) => s.setTutorial);
  const settings = useSettingsStore();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!settings.tutorialSeen && !open) {
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  const s = STEPS[step];
  const close = () => {
    setOpen(false);
    setStep(0);
    settings.markTutorialSeen();
  };

  return (
    <div
      role="dialog"
      aria-label="Tutorial"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="card max-w-lg w-full" style={{ background: "var(--color-paper)" }}>
        <div className="text-xs text-muted font-ui">
          Step {step + 1} of {STEPS.length}
        </div>
        <h2 className="font-ui text-xl font-semibold mt-1 mb-2">{s.title}</h2>
        <p className="leading-relaxed mb-4">{s.body}</p>
        <div className="flex justify-between">
          <button
            className="btn"
            onClick={() => setStep((i) => Math.max(0, i - 1))}
            disabled={step === 0}
          >
            Back
          </button>
          <div className="flex gap-2">
            <button className="btn" onClick={close}>
              Skip
            </button>
            {step < STEPS.length - 1 ? (
              <button
                className="btn btn-primary"
                onClick={() => setStep((i) => Math.min(STEPS.length - 1, i + 1))}
              >
                Next
              </button>
            ) : (
              <button className="btn btn-primary" onClick={close}>
                Start practicing
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
