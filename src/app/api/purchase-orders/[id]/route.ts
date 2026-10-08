import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { readPrivateFile } from "@/lib/storage";

/** Downloads the signed PO a buyer attached: only that buyer or an admin. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response("Sign in to view this purchase order", { status: 401 });
  const po = await db.purchaseOrder.findUnique({ where: { id: (await params).id } });
  if (!po || !po.fileKey || !(user.role === "ADMIN" || po.buyerId === user.id)) return new Response("Not found", { status: 404 });
  const file = await readPrivateFile(po.fileKey);
  if (!file) return new Response("Not found", { status: 404 });
  const name = (po.fileName ?? `PO-${po.poNumber}.pdf`).replace(/[^\w.\- ]/g, "_");
  return new Response(file as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
