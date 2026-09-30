"use client";
import { useEffect, useState } from "react";

/** Shows the one-shot `flash` cookie set by server actions, then clears it. */
export function Toast({ flash }: { flash?: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!flash) return;
    setMsg(flash.slice(flash.indexOf("|") + 1));
    document.cookie = "flash=; path=/; max-age=0";
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [flash]);
  return (
    <div className={`toast${msg ? " on" : ""}`} role="status" aria-live="polite">
      {msg}
    </div>
  );
}
