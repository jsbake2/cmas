import { useState } from "react";
import { useAdminStore } from "@/store/admin";

/**
 * Tiny inline control showing the current admin state. Unlocked: shows a
 * "PARENT MODE" badge with a Lock button. Locked: shows a "Parent unlock"
 * button that expands into a password prompt.
 */
export default function AdminBar() {
  const isAdmin = useAdminStore((s) => s.isAdmin);
  const unlock = useAdminStore((s) => s.unlock);
  const lock = useAdminStore((s) => s.lock);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (unlock(pw)) {
      setShowPrompt(false);
      setPw("");
      setErr(false);
    } else {
      setErr(true);
      setPw("");
    }
  }

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2 text-xs font-ui">
        <span
          className="px-2 py-1 rounded-full font-semibold"
          style={{ background: "#7c2d12", color: "white" }}
        >
          PARENT MODE
        </span>
        <button
          className="text-accent underline text-xs"
          onClick={lock}
        >
          Lock
        </button>
      </div>
    );
  }

  if (showPrompt) {
    return (
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setErr(false);
          }}
          className="border border-border rounded px-2 py-1 text-sm bg-paper text-ink"
          placeholder="parent password"
          aria-label="Parent password"
        />
        <button type="submit" className="btn">
          Unlock
        </button>
        <button
          type="button"
          className="text-accent underline text-xs"
          onClick={() => {
            setShowPrompt(false);
            setPw("");
            setErr(false);
          }}
        >
          Cancel
        </button>
        {err && (
          <span className="text-xs" style={{ color: "#b91c1c" }}>
            Wrong password
          </span>
        )}
      </form>
    );
  }

  return (
    <button
      className="btn text-xs"
      onClick={() => setShowPrompt(true)}
      title="Unlock destructive actions (reset, parent review)"
    >
      🔓 Parent unlock
    </button>
  );
}
