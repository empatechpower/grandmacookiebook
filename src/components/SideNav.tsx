"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SideNav({ label, links, counts = {} }: { label: string; links: [string, string][]; counts?: Record<string, number> }) {
  const path = usePathname();
  // Most specific match wins so "/dashboard/author" isn't highlighted on its sub-pages.
  const active = links.map(([href]) => href).filter((h) => path === h || path.startsWith(h + "/")).sort((a, b) => b.length - a.length)[0];
  return (
    <aside className="side">
      <p className="side-label">{label}</p>
      {links.map(([href, text]) => (
        <Link key={href} href={href} className={href === active ? "on" : ""}>
          {text}
          {counts[href] ? <span className="nav-count">{counts[href]}</span> : null}
        </Link>
      ))}
    </aside>
  );
}
