"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { done, fail, str } from "@/lib/actions";
import { findConversation, side } from "@/lib/messages";
import { bookableAuthor } from "@/lib/directory";
import { newMessage } from "@/lib/notify";

/**
 * Opens (or creates) the thread between a buyer and an author.
 * Buyers can message any bookable author. Authors can only message buyers who
 * already booked or bought from them, so the inbox can't be used for cold outreach.
 */
export async function openConversation(fd: FormData) {
  const user = await requireUser("BUYER", "AUTHOR");
  const otherId = str(fd, "with");
  let buyerId: string, authorId: string;
  if (user.role === "BUYER") {
    const author = await db.user.findFirst({ where: { id: otherId, ...bookableAuthor } });
    if (!author) return fail("This author isn't available for messages");
    [buyerId, authorId] = [user.id, author.id];
  } else {
    const related =
      (await db.booking.count({ where: { authorId: user.id, buyerId: otherId } })) +
      (await db.orderItem.count({ where: { authorId: user.id, order: { buyerId: otherId } } }));
    if (!related) return fail("You can message buyers once they've booked or ordered from you");
    [buyerId, authorId] = [otherId, user.id];
  }
  const convo = await db.conversation.upsert({
    where: { buyerId_authorId: { buyerId, authorId } },
    update: {},
    create: { buyerId, authorId },
  });
  const draft = str(fd, "draft");
  redirect(`/dashboard/messages/${convo.id}${draft ? `?draft=${encodeURIComponent(draft)}` : ""}`);
}

export async function sendMessage(fd: FormData) {
  const user = await requireUser("BUYER", "AUTHOR");
  const convo = await findConversation(str(fd, "conversationId"), user);
  if (!convo) return fail("Conversation not found");
  const body = str(fd, "body");
  if (!body) return;
  if (body.length > 2000) return fail("Messages are limited to 2,000 characters");
  const now = new Date();
  // Email only for the first unread message, so a back-and-forth doesn't flood the inbox.
  const recipientWasCaughtUp = convo.lastMessageAt <= (side(user) === "author" ? convo.buyerLastReadAt : convo.authorLastReadAt);
  await db.$transaction([
    db.message.create({ data: { conversationId: convo.id, senderId: user.id, body } }),
    db.conversation.update({
      where: { id: convo.id },
      data: { lastMessageAt: now, [side(user) === "author" ? "authorLastReadAt" : "buyerLastReadAt"]: now },
    }),
  ]);
  if (recipientWasCaughtUp) {
    const to = await db.user.findUniqueOrThrow({ where: { id: side(user) === "author" ? convo.buyerId : convo.authorId }, select: { name: true, email: true } });
    await newMessage({ to, from: user.name, body, conversationId: convo.id });
  }
  await done(null);
}
