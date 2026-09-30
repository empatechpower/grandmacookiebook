import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Header } from "@/components/Header";
import { Toast } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atelier — Book authors. Buy books. Host talks.",
  description: "Buy books directly from authors and book them for school visits, talks and keynotes.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const flash = (await cookies()).get("flash")?.value;
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650;9..144,720&family=Outfit:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <Header />
        <main className="page">{children}</main>
        <footer className="site">
          <div className="wrap foot">
            <div>© {new Date().getFullYear()} Atelier — literary marketplace.</div>
            <nav className="foot-links" aria-label="Footer">
              <Link href="/authors">Find an author</Link>
              <Link href="/how-it-works">How it works</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/referral">Referral program</Link>
              <Link href="/contact">Contact us</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </nav>
          </div>
        </footer>
        <Toast flash={flash} />
      </body>
    </html>
  );
}
