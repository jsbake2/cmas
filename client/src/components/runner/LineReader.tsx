import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store/settings";

export default function LineReader() {
  const on = useSettingsStore((s) => s.lineReader);
  const [y, setY] = useState(300);
  const [bandHeight] = useState(56);

  useEffect(() => {
    if (!on) return;
    function move(e: MouseEvent) {
      setY(e.clientY - bandHeight / 2);
    }
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [on, bandHeight]);

  if (!on) return null;
  return (
    <>
      <div
        className="line-reader-mask"
        style={{ left: 0, top: 0, right: 0, height: y }}
      />
      <div
        className="line-reader-mask"
        style={{ left: 0, top: y + bandHeight, right: 0, bottom: 0 }}
      />
    </>
  );
}
