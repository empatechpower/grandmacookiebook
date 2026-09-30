import { db } from "@/lib/db";
import { toggleHandled } from "@/app/actions/contact";
import { PageHead, Table, fmtDateTime } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function Inbox({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const all = !!(await searchParams).all;
  const msgs = await db.contactMessage.findMany({ where: all ? {} : { handled: false }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <PageHead
        title="Contact inbox"
        sub="Messages from the public contact form. Reply by email, then mark handled."
        action={<a className="btn btn-ghost btn-sm" href={all ? "?" : "?all=1"}>{all ? "Show open only" : "Show all"}</a>}
      />
      <Table heads={["Received", "From", "Topic", "Message", ""]} empty={all ? "No messages yet." : "Inbox zero — nothing open."}>
        {msgs.map((m) => (
          <tr key={m.id} style={m.handled ? { opacity: 0.55 } : undefined}>
            <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(m.createdAt)}</td>
            <td>{m.name}<div><a className="muted" style={{ fontSize: ".8rem", textDecoration: "underline" }} href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + m.topic)}`}>{m.email}</a></div></td>
            <td>{m.topic}</td>
            <td style={{ maxWidth: 420, whiteSpace: "pre-wrap" }}>{m.body}</td>
            <td>
              <form action={toggleHandled}>
                <input type="hidden" name="id" value={m.id} />
                <SubmitButton className="btn btn-line btn-sm">{m.handled ? "Reopen" : "Handled"}</SubmitButton>
              </form>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
