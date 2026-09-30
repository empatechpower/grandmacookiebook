import "server-only";
import { db } from "./db";
import type { CurrentUser } from "./auth";

/** Which side of a conversation this user is on, for choosing the right lastReadAt column. */
export const side = (user: CurrentUser) => (user.role === "AUTHOR" ? "author" : "buyer");

export async function unreadCount(user: CurrentUser) {
  if (user.role === "ADMIN") return 0;
  const convos = await db.conversation.findMany({
    where: user.role === "AUTHOR" ? { authorId: user.id } : { buyerId: user.id },
    select: { lastMessageAt: true, buyerLastReadAt: true, authorLastReadAt: true },
  });
  const mine = side(user) === "author" ? "authorLastReadAt" : "buyerLastReadAt";
  return convos.filter((c) => c.lastMessageAt > c[mine]).length;
}

/** A conversation the user participates in, or null. */
export function findConversation(id: string, user: CurrentUser) {
  return db.conversation.findFirst({ where: { id, OR: [{ buyerId: user.id }, { authorId: user.id }] } });
}
