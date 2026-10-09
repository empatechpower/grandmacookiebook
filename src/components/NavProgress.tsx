"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A slim bar at the top of the screen while the next page loads, so clicks always get
 * instant feedback. Starts on any same-site link click or GET form submit (e.g. search),
 * and finishes when the new page's URL is in place.
 */
export function NavProgress() {
  const path = usePathname();
  const params = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => setActive(false), [path, params]);

  useEffect(() => {
    const sameSite = (url: URL) => url.origin === location.origin && url.href !== location.href;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (sameSite(url) && !(url.pathname === location.pathname && url.search === location.search)) setActive(true);
    };
    const onSubmit = (e: SubmitEvent) => {
      const f = e.target as HTMLFormElement;
      if (!e.defaultPrevented && f.method.toLowerCase() === "get") setActive(true);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(false), 15000); // never stick if a navigation is abandoned
    return () => clearTimeout(t);
  }, [active]);

  return <div className={`nav-progress${active ? " on" : ""}`} role="progressbar" aria-hidden={!active} aria-label="Loading page" />;
}
