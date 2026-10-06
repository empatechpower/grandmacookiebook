import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatLabel } from "@/lib/constants";
import { money } from "@/lib/money";
import { toggleArchive } from "@/app/actions/author";
import { Badge, PageHead, Table } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function AuthorPackages() {
  const user = await requireUser("AUTHOR");
  const pkgs = await db.visitPackage.findMany({ where: { authorId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHead title="Listings" sub="Your visit, workshop and speaking listings — pricing, location and visit details. Set the dates you're free under Availability." action={<Link className="btn btn-terra" href="/dashboard/author/visits/new">+ Create New Listing</Link>} />
      <Table heads={["Listing", "Format", "Duration", "Price", "Status", ""]} empty="No listings yet — create your first visit or keynote.">
        {pkgs.map((p) => (
          <tr key={p.id}>
            <td>
              <b>{p.title}</b>
              {p.status === "REJECTED" && p.reviewNote && <div style={{ fontSize: ".8rem", color: "var(--danger)" }}>{p.reviewNote}</div>}
            </td>
            <td>{formatLabel(p.format)}</td>
            <td>{p.durationMins} min</td>
            <td>{money(p.fee)}</td>
            <td><Badge status={p.status} /></td>
            <td>
              <div className="row">
                <Link className="btn btn-line btn-sm" href={`/dashboard/author/visits/${p.id}`}>Edit</Link>
                <form action={toggleArchive}>
                  <input type="hidden" name="kind" value="package" />
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton className="btn btn-ghost btn-sm">{p.status === "ARCHIVED" ? "Restore" : "Archive"}</SubmitButton>
                </form>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
