"use server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { done, fail, str } from "@/lib/actions";
import { hasFile, savePrivatePdf } from "@/lib/storage";
import { contractAttached } from "@/lib/notify";

/** Either party on an active booking can attach (or replace) a PDF contract. */
export async function attachContract(fd: FormData) {
  const user = await requireUser("BUYER", "AUTHOR");
  const b = await db.booking.findFirst({
    where: { id: str(fd, "id"), OR: [{ buyerId: user.id }, { authorId: user.id }], status: { in: ["PENDING", "ACCEPTED", "CONFIRMED"] } },
  });
  if (!b) return fail("Contracts can be attached to active bookings only");
  const file = fd.get("contract");
  if (!hasFile(file)) return fail("Choose a PDF to attach");
  const saved = await savePrivatePdf(file);
  if ("error" in saved) return fail(saved.error);
  await db.booking.update({
    where: { id: b.id },
    data: { contractKey: saved.key, contractName: file.name.slice(0, 120) || "contract.pdf", contractById: user.id },
  });
  await contractAttached(b.id, user.id);
  await done("Contract attached — the other side has been notified");
}
