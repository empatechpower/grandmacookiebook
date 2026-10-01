"use client";
import { usePathname } from "next/navigation";

/** Shows the public site header and footer everywhere except the dashboard, which has its own sidebar. */
export function SiteChrome({ header, footer, children }: { header: React.ReactNode; footer: React.ReactNode; children: React.ReactNode }) {
  const inDashboard = usePathname().startsWith("/dashboard");
  return (
    <>
      {!inDashboard && header}
      <main className={inDashboard ? "page page-dash" : "page"}>{children}</main>
      {!inDashboard && footer}
    </>
  );
}
