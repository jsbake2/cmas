import { useEffect, useMemo, useRef, useState } from "react";
import { useSessionStore } from "@/store/session";
import { useSettingsStore } from "@/store/settings";

export default function Timer() {
  const enabled = useSettingsStore((s) => s.timerEnabled);
  const minutes = useSettingsStore((s) => s.timerMinutes);
  const session = useSessionStore();
  const t = session.state?.timer;
  const [now, setNow] = useState(Date.now());
  const announced = useRef(false);

  // initialize if enabled and not yet started
  useEffect(() => {
    if (!enabled || !session.state) return;
    if (!t) {
      session.setTimerState({
        startedAt: Date.now(),
        minutes,
        remainingMs: minutes * 60_000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, session.state?.unitId]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [enabled]);

  const remainingMs = useMemo(() => {
    if (!enabled || !t) return null;
    const elapsed = now - t.startedAt;
    return Math.max(0, t.minutes * 60_000 - elapsed);
  }, [enabled, t, now]);

  useEffect(() => {
    if (remainingMs == null) return;
    if (remainingMs === 0 && !announced.current) {
      announced.current = true;
      alert(
        "Time's up! You can keep working — this is just practice — or head to the Review screen to submit.",
      );
    }
  }, [remainingMs]);

  if (!enabled || remainingMs == null) return null;
  const mm = Math.floor(remainingMs / 60_000);
  const ss = Math.floor((remainingMs % 60_000) / 1000);
  return (
    <div
      className="text-sm font-ui font-semibold"
      aria-live="polite"
      style={{ color: remainingMs < 60_000 ? "#c62828" : undefined }}
    >
      ⏱ {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
    </div>
  );
}
