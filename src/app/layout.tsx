import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { cookies } from "next/headers";
import { Header } from "@/components/Header";
import { Toast } from "@/components/Toast";
import { SiteChrome } from "@/components/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${BRAND.name} — Buy books. Book authors. Host talks.`, template: `%s · ${BRAND.name}` },
  description: "Buy books directly from authors and book them for school visits, talks and keynotes.",
};

const FOOTER: [string, [string, string][]][] = [
  ["Marketplace", [["Find an author", "/authors"], ["Books", "/books"], ["Talks & visits", "/visits"], ["Collections", "/collections"], ["Post a request", "/dashboard/buyer/requests/new"]]],
  ["Solutions", [["For schools", "/for-schools"], ["For business", "/for-business"], ["For authors", "/for-authors"], ["Book fairs", "/book-fairs"], ["How it works", "/how-it-works"]]],
  ["Resources", [["Resources", "/resources"], ["Events", "/events"], ["Newsroom", "/news"], ["Book bank", "/book-bank"], ["Referral program", "/referral"]]],
  ["Company", [["Pricing", "/pricing"], ["Contact us", "/contact"], ["Privacy", "/privacy"], ["Terms", "/terms"]]],
];

// Social links appear in the footer only when set (SOCIAL_FACEBOOK=https://… etc.).
const SOCIALS = (
  [["Facebook", process.env.SOCIAL_FACEBOOK], ["Instagram", process.env.SOCIAL_INSTAGRAM], ["LinkedIn", process.env.SOCIAL_LINKEDIN], ["TikTok", process.env.SOCIAL_TIKTOK], ["X", process.env.SOCIAL_X]] as [string, string | undefined][]
).filter((x): x is [string, string] => !!x[1]);

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
        <SiteChrome
          header={<Header />}
          footer={
  <footer className="site">
            <div className="wrap">
              <div className="foot-grid">
                <div className="foot-brand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/logo.jpg" alt={`${BRAND.name} logo`} width={128} height={128} className="foot-logo" />
                <b className="serif">{BRAND.name}</b>
                  <p>The marketplace for books and author visits — connecting schools, libraries and businesses with vetted authors.</p>
                  <p className="foot-contact">
                    <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
                    <br />
                    {BRAND.address.join(", ")}
                  </p>
                  {SOCIALS.length > 0 && (
                    <div className="foot-links" style={{ marginTop: 10 }}>
                      {SOCIALS.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer">{label}</a>)}
                    </div>
                  )}
                </div>
                {FOOTER.map(([heading, links]) => (
                  <nav key={heading} aria-label={heading}>
                    <h4>{heading}</h4>
                    {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
                  </nav>
                ))}
              </div>
              <div className="foot">
                <div>© {new Date().getFullYear()} {BRAND.name}</div>
                <div className="foot-links">
                  <Link href="/privacy">Privacy</Link>
                  <Link href="/terms">Terms</Link>
                  <Link href="/contact">Contact</Link>
                </div>
              </div>
            </div>
          </footer>
          }
        >
          {children}
        </SiteChrome>
        <Toast flash={flash} />
      </body>
    </html>
  );
}
