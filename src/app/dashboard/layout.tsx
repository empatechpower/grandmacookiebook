import { requireUser } from "@/lib/auth";
import { SideNav } from "@/components/SideNav";
import { unreadCount } from "@/lib/messages";
import { db } from "@/lib/db";

// Entries whose href starts with "#" are group headings.
const NAV: Record<string, { label: string; links: [string, string][] }> = {
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
    links: [
      ["/dashboard/author", "Overview"],
      ["#listings", "Listings"],
      ["/dashboard/author/books", "My books"],
      ["/dashboard/author/visits", "Visit packages"],
      ["/dashboard/author/availability", "Availability"],
      ["#work", "Bookings & sales"],
      ["/dashboard/author/requests", "Booking requests"],
      ["/dashboard/author/opportunities", "Opportunities"],
      ["/dashboard/author/orders", "Book orders"],
      ["/dashboard/messages", "Messages"],
      ["#growth", "Money & growth"],
      ["/dashboard/author/payouts", "Payouts"],
      ["/dashboard/author/reviews", "Reviews"],
      ["/dashboard/author/referrals", "Referrals"],
      ["/dashboard/author/profile", "Public profile"],
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
  return (
    <div className="dash">
      <SideNav label={nav.label} links={nav.links} counts={{ "/dashboard/messages": unread, "/dashboard/admin/inbox": openContacts, "/dashboard/admin/issues": openIssues, "/dashboard/admin/referrals": pendingReferrals }} />
      <div className="main">{children}</div>
    </div>
  );
}
