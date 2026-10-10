import Link from "next/link";
import Form from "next/form";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { backfillAuthorSlugs } from "@/lib/slugs";
import { ROLE_LABEL, type Role } from "@/lib/constants";
import { setUserStatus } from "@/app/actions/admin";
import { Badge, PageHead, Table, fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

const FILTERS = [
  ["all", "All"],
  ["pending", "Pending authors"],
  ["AUTHOR", "Authors"],
  ["BUYER", "Buyers"],
  ["ADMIN", "Admins"],
  ["suspended", "Suspended"],
] as const;

export default async function Users({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const me = await requireUser("ADMIN");
  await backfillAuthorSlugs();
  const { filter = "all", q = "" } = await searchParams;
  const where = {
    ...(filter === "pending" ? { status: "PENDING" } : {}),
    ...(filter === "suspended" ? { status: "SUSPENDED" } : {}),
    ...(["AUTHOR", "BUYER", "ADMIN"].includes(filter) ? { role: filter } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] } : {}),
  };
  const users = await db.user.findMany({
    where,
    include: { _count: { select: { books: true, packages: true, orders: true, bookingsMade: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return (
    <>
      <PageHead title="Users & authors" sub="Approve new authors, suspend abuse. Suspended users can't sign in and their listings are hidden." />
      <div className="split" style={{ marginBottom: 16 }}>
        <div className="filters" style={{ margin: 0 }}>
          {FILTERS.map(([v, l]) => (
            <Link key={v} className={`filter${filter === v ? " active" : ""}`} href={`?filter=${v}`}>{l}</Link>
          ))}
        </div>
        <Form className="inline-form" action="/dashboard/admin/users">
          <input type="hidden" name="filter" value={filter} />
          <input name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search name or email" maxLength={100} />
          <SubmitButton className="btn btn-line btn-sm" pendingText="Searching…">Search</SubmitButton>
        </Form>
      </div>
      <Table heads={["Name", "Role", "Activity", "Joined", "Status", ""]} empty="No users match.">
        {users.map((u) => (
          <tr key={u.id}>
            <td>
              <b>{u.name}</b>
              <div className="muted" style={{ fontSize: ".8rem" }}>{u.email}</div>
              {u.emailVerifiedAt ? <span className="badge b-ok" title={`Confirmed ${fmtDate(u.emailVerifiedAt)}`}>✓ Email verified</span> : <span className="badge b-wait" title="Hasn't clicked the confirmation link yet">Email not verified</span>}
            </td>
            <td>{ROLE_LABEL[u.role as Role]}</td>
            <td style={{ fontSize: ".82rem" }}>
              {u.role === "AUTHOR" && (
                <>
                  {u._count.books} books · {u._count.packages} packages
                  <div>{u.payoutsReady ? <span className="badge b-ok">Stripe ready</span> : <span className="badge b-wait">No Stripe</span>}</div>
                </>
              )}
              {u.role === "BUYER" && `${u._count.orders} orders · ${u._count.bookingsMade} bookings`}
            </td>
            <td>{fmtDate(u.createdAt)}</td>
            <td><Badge status={u.status} /></td>
            <td>
              {u.id !== me.id && (
                <form action={setUserStatus}>
                  <input type="hidden" name="id" value={u.id} />
                  {u.status === "PENDING" && <SubmitButton name="status" value="ACTIVE" className="btn btn-sage btn-sm">Approve</SubmitButton>}
                  {u.status === "SUSPENDED" && <SubmitButton name="status" value="ACTIVE" className="btn btn-line btn-sm">Reactivate</SubmitButton>}
                  {u.status !== "SUSPENDED" && (
                    <SubmitButton name="status" value="SUSPENDED" className="btn btn-danger btn-sm" confirm={`Suspend ${u.name}?`} style={{ marginLeft: 6 }}>
                      Suspend
                    </SubmitButton>
                  )}
                </form>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
