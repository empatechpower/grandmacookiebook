import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { findConversation, side } from "@/lib/messages";
import { money } from "@/lib/money";
import { Badge, fmtDate, fmtDateTime } from "@/components/ui";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Composer } from "@/components/Composer";

export default async function Thread({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ draft?: string }> }) {
  const user = await requireUser("BUYER", "AUTHOR");
  const convo = await findConversation((await params).id, user);
  if (!convo) notFound();
  const asAuthor = side(user) === "author";

  // Viewing the thread marks it read.
  await db.conversation.update({
    where: { id: convo.id },
    data: asAuthor ? { authorLastReadAt: new Date() } : { buyerLastReadAt: new Date() },
  });
  const [messages, other, bookings] = await Promise.all([
    db.message.findMany({ where: { conversationId: convo.id }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.user.findUniqueOrThrow({ where: { id: asAuthor ? convo.buyerId : convo.authorId }, select: { id: true, name: true } }),
    db.booking.findMany({
      where: { buyerId: convo.buyerId, authorId: convo.authorId, status: { in: ["PENDING", "ACCEPTED", "CONFIRMED"] } },
      include: { package: { select: { title: true } } },
      orderBy: { eventDate: "asc" },
    }),
  ]);

  return (
    <>
      <AutoRefresh seconds={8} />
      <div className="split" style={{ marginBottom: 14 }}>
        <div>
          <Link href="/dashboard/messages" className="muted" style={{ fontSize: ".85rem" }}>← All messages</Link>
          <h2>{asAuthor ? other.name : <Link href={`/authors/${other.id}`}>{other.name}</Link>}</h2>
        </div>
        {!asAuthor && <Link className="btn btn-line btn-sm" href={`/authors/${other.id}`}>View packages & book</Link>}
      </div>
      {bookings.length > 0 && (
        <div className="alert alert-info">
          {bookings.map((b) => (
            <div key={b.id}>
              B-{b.number} · {b.package.title} · {fmtDate(b.eventDate)} · {money(b.fee)} <Badge status={b.status} />
            </div>
          ))}
        </div>
      )}
      <div className="thread">
        {messages.length === 0 && <p className="muted" style={{ margin: "auto" }}>Say hello — share your date, audience and any travel details.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`bubble${m.senderId === user.id ? " mine" : ""}`}>
            {m.body}
            <time dateTime={m.createdAt.toISOString()}>{fmtDateTime(m.createdAt)}</time>
          </div>
        ))}
      </div>
      <Composer conversationId={convo.id} draft={(await searchParams).draft} />
      <p className="muted" style={{ fontSize: ".75rem", marginTop: 8 }}>
        Keep payments on Grandma Cookie Book — bookings paid outside the platform aren’t covered.
      </p>
    </>
  );
}
