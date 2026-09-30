import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { readPrivateFile } from "@/lib/storage";

/** Downloads a booking's contract: only its buyer, its author, or an admin. */
export async function GET(_: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await currentUser();
  if (!user) return new Response("Sign in to view this contract", { status: 401 });
  const b = await db.booking.findUnique({ where: { id: (await params).bookingId } });
  const allowed = b && (user.role === "ADMIN" || b.buyerId === user.id || b.authorId === user.id);
  if (!b || !allowed || !b.contractKey) return new Response("Not found", { status: 404 });
  const file = await readPrivateFile(b.contractKey);
  if (!file) return new Response("Not found", { status: 404 });
  const name = (b.contractName ?? `contract-B-${b.number}.pdf`).replace(/[^\w.\- ]/g, "_");
  return new Response(file as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
