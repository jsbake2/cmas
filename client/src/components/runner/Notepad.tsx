import { useEffect, useRef, useState } from "react";
import { useSessionStore } from "@/store/session";
import { useToolsStore } from "@/store/tools";

interface Props {
  passageId: string;
}

export default function Notepad({ passageId }: Props) {
  const open = useToolsStore((s) => s.notepadOpen);
  const setOpen = useToolsStore((s) => s.setNotepad);
  const session = useSessionStore();
  const note = session.state?.notes[passageId] ?? "";

  const [pos, setPos] = useState({ x: 80, y: 80 });
  const drag = useRef<{ ox: number; oy: number } | null>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!drag.current) return;
      setPos({ x: e.clientX - drag.current.ox, y: e.clientY - drag.current.oy });
    }
    function onUp() {
      drag.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="notepad-window"
      style={{ left: pos.x, top: pos.y }}
      role="dialog"
      aria-label="Notepad"
    >
      <header
        onMouseDown={(e) => {
          drag.current = { ox: e.clientX - pos.x, oy: e.clientY - pos.y };
        }}
      >
        <span>Notepad — this passage</span>
        <button
          type="button"
          aria-label="Close notepad"
          onClick={() => setOpen(false)}
          className="px-2"
        >
          ✕
        </button>
      </header>
      <textarea
        value={note}
        placeholder="Jot notes while you read…"
        onChange={(e) => session.setNote(passageId, e.target.value)}
      />
    </div>
  );
}
