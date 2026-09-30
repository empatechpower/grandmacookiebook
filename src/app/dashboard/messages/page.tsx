import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { side } from "@/lib/messages";
import { Initials, PageHead, fmtDate } from "@/components/ui";
import { AutoRefresh } from "@/components/AutoRefresh";

export default async function Inbox() {
  const user = await requireUser("BUYER", "AUTHOR");
  const asAuthor = side(user) === "author";
  const convos = await db.conversation.findMany({
    where: asAuthor ? { authorId: user.id } : { buyerId: user.id },
    include: {
      buyer: { select: { name: true } },
      author: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  });
  return (
    <>
      <AutoRefresh seconds={15} />
      <PageHead
        title="Messages"
        sub={asAuthor ? "Conversations with schools and buyers." : "Ask questions, agree scope and travel before you book."}
        action={!asAuthor && <Link className="btn btn-ink" href="/authors">Find an author</Link>}
      />
      {convos.length === 0 ? (
        <div className="empty">
          No conversations yet.{" "}
          {!asAuthor && <Link href="/authors" style={{ color: "var(--terracotta)" }}>Message an author from their profile.</Link>}
        </div>
      ) : (
        <div className="inbox table-wrap">
          {convos.map((c) => {
            const other = asAuthor ? c.buyer.name : c.author.name;
            const unread = c.lastMessageAt > (asAuthor ? c.authorLastReadAt : c.buyerLastReadAt);
            const last = c.messages[0];
            return (
              <Link key={c.id} href={`/dashboard/messages/${c.id}`} className={unread ? "unread" : ""}>
                <Initials name={other} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="split">
                    <b>{other}</b>
                    <span className="muted" style={{ fontSize: ".78rem" }}>{fmtDate(c.lastMessageAt)}</span>
                  </div>
                  <div className="muted" style={{ fontSize: ".85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {last ? `${last.senderId === user.id ? "You: " : ""}${last.body}` : "No messages yet"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
