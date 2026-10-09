import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { currentUser, dashboardPath } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABEL, type Role } from "@/lib/constants";
import { logout } from "@/app/actions/auth";

export async function Header() {
  const user = await currentUser();
  const cartCount =
    user?.role === "BUYER" ? (await db.cartItem.aggregate({ where: { userId: user.id }, _sum: { qty: true } }))._sum.qty ?? 0 : 0;
  const chip = user ? { ADMIN: "admin", AUTHOR: "author", BUYER: "buyer" }[user.role] : "";

  return (
    <header className="topbar">
      <div className="wrap topbar-inner">
        <Link className="mark" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mark-logo" src={BRAND.logo} alt="" width={80} height={80} />
          <div>
            <b>{BRAND.name}</b>
            <small>{BRAND.tagline}</small>
          </div>
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/authors">Find authors</Link>
          <Link href="/books">Books</Link>
          <Link href="/visits">Author Visit</Link>
          <div className="dd">
            <button type="button" className="dd-btn" aria-haspopup="true">Solutions ▾</button>
            <div className="dd-menu">
              <Link href="/for-schools">For schools & libraries</Link>
              <Link href="/for-business">For business</Link>
              <Link href="/for-authors">For authors</Link>
              <Link href="/book-fairs">Book fairs</Link>
              <Link href="/how-it-works">How it works</Link>
            </div>
          </div>
          <div className="dd">
            <button type="button" className="dd-btn" aria-haspopup="true">Resources ▾</button>
            <div className="dd-menu">
              <Link href="/collections">Collections</Link>
              <Link href="/events">Events</Link>
              <Link href="/resources">Resources</Link>
              <Link href="/news">Newsroom</Link>
              <Link href="/book-bank">Book bank</Link>
            </div>
          </div>
        </nav>
        <div className="actions">
          {user ? (
            <>
              <span className={`chip-role ${chip}`}>{ROLE_LABEL[user.role as Role]}</span>
              {user.role === "BUYER" && (
                <Link className="btn btn-ghost" href="/cart">
                  Cart{cartCount ? ` (${cartCount})` : ""}
                </Link>
              )}
              <Link className="btn btn-ghost hide-sm" href={dashboardPath(user.role)}>
                {user.name.split(" ")[0]} desk
              </Link>
              <form action={logout}>
                <button className="btn btn-line">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" href="/login">
                Log in
              </Link>
              <Link className="btn btn-terra" href="/signup">
                Join free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
