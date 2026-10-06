import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { SideNav, type NavLink } from "@/components/SideNav";
import { BRAND } from "@/lib/brand";
import { ROLE_LABEL, type Role } from "@/lib/constants";
import { logout } from "@/app/actions/auth";
import { unreadCount } from "@/lib/messages";
import { db } from "@/lib/db";

// Entries whose href starts with "#" are group headings.
const NAV: Record<string, { label: string; links: NavLink[] }> = {
  BUYER: {
    label: "Library",
    links: [
      ["/dashboard/buyer", "Overview"],
      ["#activity", "Activity"],
      ["/dashboard/buyer/bookings", "My bookings"],
      ["/dashboard/buyer/requests", "Requests & bids"],
      ["/dashboard/buyer/orders", "Orders"],
      ["/dashboard/messages", "Messages"],
      ["#account", "Account"],
      ["/dashboard/buyer/profile", "Profile"],
    ],
  },
  AUTHOR: {
    label: "Studio",
    // Top-level items follow the client's requested menu; indented items ("sub") sit under them.
    links: [
      ["/dashboard/author", "Dashboard"],
      ["/dashboard/author/requests", "Bookings"],
      ["/dashboard/author/availability", "Availability", "sub"],
      ["/dashboard/author/opportunities", "Opportunities", "sub"],
      ["/dashboard/messages", "Messages", "sub"],
      ["/dashboard/author/orders", "Orders"],
      ["/dashboard/author/visits", "Listings"],
      ["/dashboard/author/books", "Products"],
      ["/dashboard/author/profile", "Storefront"],
      ["/dashboard/author/media", "Media", "sub"],
      ["/dashboard/author/reviews", "Reviews", "sub"],
      ["/dashboard/author/settings", "Settings"],
      ["/dashboard/author/payouts", "Payouts", "sub"],
      ["/dashboard/author/referrals", "Referrals", "sub"],
    ],
  },
  ADMIN: {
    label: "Control",
    links: [
      ["/dashboard/admin", "Overview"],
      ["#marketplace", "Marketplace"],
      ["/dashboard/admin/users", "Users & authors"],
      ["/dashboard/admin/listings", "Listings review"],
      ["/dashboard/admin/orders", "Orders"],
      ["/dashboard/admin/bookings", "Bookings"],
      ["/dashboard/admin/issues", "Problem reports"],
      ["/dashboard/admin/reviews", "Reviews"],
      ["#content", "Content"],
      ["/dashboard/admin/collections", "Collections"],
      ["/dashboard/admin/articles", "News & events"],
      ["/dashboard/admin/inbox", "Contact inbox"],
      ["#money", "Money & settings"],
      ["/dashboard/admin/referrals", "Referrals"],
      ["/dashboard/admin/settings", "Fees & admins"],
    ],
  },
};

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = NAV[user.role];
  const unread = await unreadCount(user);
  const [openContacts, openIssues] =
    user.role === "ADMIN"
      ? await Promise.all([db.contactMessage.count({ where: { handled: false } }), db.issue.count({ where: { status: "OPEN" } })])
      : [0, 0];
  const pendingReferrals = user.role === "ADMIN" ? await db.referral.count({ where: { status: "PENDING" } }) : 0;
  const cartCount =
    user.role === "BUYER" ? (await db.cartItem.aggregate({ where: { userId: user.id }, _sum: { qty: true } }))._sum.qty ?? 0 : 0;
  const chip = { ADMIN: "admin", AUTHOR: "author", BUYER: "buyer" }[user.role];
  return (
    <div className="dash">
      <aside className="side">
        <Link className="mark side-brand" href="/">
          <div className="mark-icon">{BRAND.mark}</div>
          <b>{BRAND.name}</b>
        </Link>
        <div className="side-user">
          <div className="avatar" aria-hidden>{user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</div>
          <div style={{ minWidth: 0 }}>
            <b>{user.name}</b>
            <span className={`chip-role ${chip}`}>{ROLE_LABEL[user.role as Role]}</span>
          </div>
        </div>
        <SideNav
          label={nav.label}
          links={nav.links}
          counts={{ "/dashboard/messages": unread, "/dashboard/admin/inbox": openContacts, "/dashboard/admin/issues": openIssues, "/dashboard/admin/referrals": pendingReferrals }}
        />
        <div className="side-foot">
          {user.role === "BUYER" && (
            <Link href="/cart">
              Cart{cartCount ? <span className="nav-count">{cartCount}</span> : null}
            </Link>
          )}
          <Link href="/">← Back to website</Link>
          <form action={logout}>
            <button className="side-logout">Log out</button>
          </form>
        </div>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}
