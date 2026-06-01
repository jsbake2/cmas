import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useContentStore } from "@/store/content";
import { useSessionStore } from "@/store/session";
import Toolbar from "@/components/runner/Toolbar";
import PassagePanel from "@/components/runner/PassagePanel";
import ItemPanel from "@/components/items/ItemPanel";
import BottomBar from "@/components/runner/BottomBar";
import Notepad from "@/components/runner/Notepad";
import LineReader from "@/components/runner/LineReader";
import Tutorial from "@/components/runner/Tutorial";
import Timer from "@/components/runner/Timer";
import { api, type CompletedResult, type ProfileId } from "@/api/client";
import { enumerateQuizzes } from "@/lib/quizzes";

const FORM_FOR: Record<ProfileId, string> = {
  olive: "g6-form-a",
  fox: "g4-form-a",
};

export default function Runner() {
  const { profile, quizId } = useParams();
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

  const formId = FORM_FOR[p];
  const form = content && formsById.get(formId);
  const quiz = useMemo(
    () => (form ? enumerateQuizzes(form, passagesById).find((q) => q.quizId === quizId) : undefined),
    [form, passagesById, quizId],
  );

  // If this quiz has already been submitted, fetch the saved result so we can
  // offer to re-seed the session from it ("go back and fix answers" flow).
  const [savedResult, setSavedResult] = useState<CompletedResult | null>(null);
  useEffect(() => {
    if (!quiz) return;
    let cancelled = false;
    api.results(p).then((list) => {
      if (cancelled) return;
      setSavedResult(list.find((r) => r.quizId === quiz.quizId) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [p, quiz?.quizId]);

  const items = useMemo(
    () =>
      quiz?.itemIds
        .map((id) => itemsById.get(id))
        .filter((x): x is NonNullable<typeof x> => !!x) ?? [],
    [quiz, itemsById],
  );

  const currentIdx = Math.min(
    Math.max(0, session.state?.currentIndex ?? 0),
    Math.max(0, items.length - 1),
  );

  if (status !== "ready" || !content || !quiz) {
    return <div className="p-6 text-muted">Loading…</div>;
  }

  // If the current session is for a different quiz (or no session), start it.
  const sessionMatchesQuiz =
    session.state &&
    session.state.formId === formId &&
    session.state.quizId === quiz.quizId;

  if (!sessionMatchesQuiz) {
    const hasSaved = !!savedResult;
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <p className="font-ui text-lg mb-1">
          Quiz {quiz.quizN}: {quiz.passage.title}
        </p>
        <p className="text-muted mb-4 text-sm">
          {items.length} question{items.length === 1 ? "" : "s"}
          {hasSaved && " · you've submitted this one before"}
        </p>
        <div className="flex flex-col gap-2">
          {hasSaved && (
            <button
              className="btn btn-primary"
              onClick={() =>
                useSessionStore.getState().startQuiz({
                  profile: p,
                  formId,
                  quizId: quiz.quizId,
                  unitId: quiz.unitId,
                  sectionIdx: quiz.sectionIdx,
                  seedResponses: savedResult!.responses,
                  seedFlags: savedResult!.flags,
                })
              }
            >
              Continue with your previous answers
            </button>
          )}
          <button
            className={hasSaved ? "btn" : "btn btn-primary"}
            onClick={() =>
              useSessionStore.getState().startQuiz({
                profile: p,
                formId,
                quizId: quiz.quizId,
                unitId: quiz.unitId,
                sectionIdx: quiz.sectionIdx,
              })
            }
          >
            {hasSaved ? "Start over from scratch" : "Begin"}
          </button>
        </div>
        <div className="mt-4">
          <Link className="text-accent underline text-sm" to={`/profile/${p}/quizzes`}>
            ← Back to quizzes
          </Link>
        </div>
      </div>
    );
  }

  const item = items[currentIdx];
  if (!item) return <div className="p-6">Item not found.</div>;
  const passage = quiz.passage;

  function go(i: number) {
    session.setCurrentIndex(i);
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-border px-4 py-2 flex items-center gap-3 bg-paper">
        <Link to={`/profile/${p}/quizzes`} className="text-sm text-accent underline">
          ← Exit
        </Link>
        <div className="font-ui font-semibold flex-1 truncate">
          Quiz {quiz.quizN}: {passage.title}
        </div>
        <div className="text-sm text-muted">
          {p === "olive" ? "Olive" : "Fox"}
        </div>
        <Timer />
      </header>

      <Toolbar currentItem={item} />

      <div className="flex-1 flex min-h-0 relative" style={{ overflow: "hidden" }}>
        <div style={{ width: `${leftPct}%` }} className="border-r border-border min-w-0">
          <PassagePanel passages={[passage]} currentItem={item} />
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
            totalItems={items.length}
          />
        </div>
      </div>

      <BottomBar
        items={items}
        current={currentIdx}
        onChange={go}
        onReview={() => nav(`/profile/${p}/quiz/${quiz.quizId}/review`)}
      />

      {/* overlays */}
      <Notepad passageId={passage.id} />
      <LineReader />
      <Tutorial />
    </div>
  );
}
