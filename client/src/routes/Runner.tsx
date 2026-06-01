import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useContentStore } from "@/store/content";
import { useSessionStore } from "@/store/session";
import { flattenUnit } from "@/components/runner/types";
import Toolbar from "@/components/runner/Toolbar";
import PassagePanel from "@/components/runner/PassagePanel";
import ItemPanel from "@/components/items/ItemPanel";
import BottomBar from "@/components/runner/BottomBar";
import Notepad from "@/components/runner/Notepad";
import LineReader from "@/components/runner/LineReader";
import Tutorial from "@/components/runner/Tutorial";
import Timer from "@/components/runner/Timer";
import type { ProfileId } from "@/api/client";

export default function Runner() {
  const { profile, unitId } = useParams();
  const p = profile as ProfileId;
  const nav = useNavigate();
  const { content, status, load, formsById, passagesById, itemsById } =
    useContentStore();
  const session = useSessionStore();

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (session.profile !== p) {
      void session.loadFor(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);

  // splitter ratio
  const [leftPct, setLeftPct] = useState(55);
  const dragRef = useRef<{ active: boolean }>({ active: false });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current.active) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      setLeftPct(Math.min(80, Math.max(25, pct)));
    }
    function onUp() {
      dragRef.current.active = false;
      document.body.style.cursor = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const formId = p === "olive" ? "g6-form-a" : "g4-form-a";
  const form = content && formsById.get(formId);
  const unit = useMemo(
    () => form?.units.find((u) => u.id === unitId),
    [form, unitId],
  );

  const flat = useMemo(() => (unit ? flattenUnit(unit) : []), [unit]);

  const currentIdx = Math.min(
    Math.max(0, session.state?.currentIndex ?? 0),
    Math.max(0, flat.length - 1),
  );

  if (status !== "ready" || !content || !unit) {
    return <div className="p-6 text-muted">Loading…</div>;
  }

  if (!session.state || session.state.unitId !== unit.id) {
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <p className="mb-4">Starting unit “{unit.title}”…</p>
        <button
          className="btn btn-primary"
          onClick={() =>
            useSessionStore.getState().startSession(p, formId, unit.id)
          }
        >
          Begin
        </button>
      </div>
    );
  }

  const cur = flat[currentIdx];
  const item = itemsById.get(cur.itemId);
  if (!item) return <div className="p-6">Item not found.</div>;

  const section = unit.sections[cur.sectionIdx];
  const passages = section.passageIds
    .map((id) => passagesById.get(id))
    .filter((x): x is NonNullable<typeof x> => !!x);

  function go(i: number) {
    session.setCurrentIndex(i);
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-border px-4 py-2 flex items-center gap-3 bg-paper">
        <Link to={`/profile/${p}/forms`} className="text-sm text-accent underline">
          ← Exit
        </Link>
        <div className="font-ui font-semibold flex-1 truncate">
          {unit.title}
        </div>
        <div className="text-sm text-muted">
          {p === "olive" ? "Olive" : "Fox"}
        </div>
        <Timer />
      </header>

      <Toolbar currentItem={item} />

      <div className="flex-1 flex min-h-0 relative" style={{ overflow: "hidden" }}>
        <div style={{ width: `${leftPct}%` }} className="border-r border-border min-w-0">
          <PassagePanel passages={passages} currentItem={item} />
        </div>
        <div
          onMouseDown={() => {
            dragRef.current.active = true;
            document.body.style.cursor = "col-resize";
          }}
          aria-label="Resize panels"
          role="separator"
          className="w-1 cursor-col-resize bg-border hover:bg-accent"
          style={{ touchAction: "none" }}
        />
        <div style={{ width: `${100 - leftPct}%` }} className="min-w-0">
          <ItemPanel
            item={item}
            itemNumber={currentIdx + 1}
            totalItems={flat.length}
          />
        </div>
      </div>

      <BottomBar
        flat={flat}
        current={currentIdx}
        items={itemsById}
        onChange={go}
        onReview={() => nav(`/profile/${p}/review/${unit.id}`)}
      />

      {/* overlays */}
      <Notepad passageId={passages[0]?.id ?? ""} />
      <LineReader />
      <Tutorial />
    </div>
  );
}
