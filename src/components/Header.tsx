import Link from "next/link";
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
          <div className="mark-icon">A</div>
          <div>
            <b>Atelier</b>
            <small>Literary marketplace</small>
          </div>
        </Link>
        <nav className="nav">
          <Link href="/">Home</Link>
          <Link href="/authors">Authors</Link>
          <Link href="/books">Books</Link>
          <Link href="/visits">Visits &amp; talks</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
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
                Join Atelier
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
