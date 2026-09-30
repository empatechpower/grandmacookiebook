"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { done, fail, str } from "@/lib/actions";
import { contactReceived } from "@/lib/notify";
import { CONTACT_TOPICS } from "@/lib/constants";

const Schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email"),
  topic: z.enum(CONTACT_TOPICS as [string, ...string[]]),
  body: z.string().trim().min(10, "Please add a few more details").max(5000),
});

export async function submitContact(fd: FormData) {
  // Honeypot: real people never see or fill this field.
  if (str(fd, "website")) return done("Thanks — we'll be in touch", "/contact?sent=1");
  const p = Schema.safeParse({ name: str(fd, "name"), email: str(fd, "email"), topic: str(fd, "topic"), body: str(fd, "body") });
  if (!p.success) return fail(p.error.issues[0].message, "/contact");
  await db.contactMessage.create({ data: p.data });
  await contactReceived(p.data);
  await done("Thanks — we'll reply by email within 2 business days", "/contact?sent=1");
}

export async function toggleHandled(fd: FormData) {
  await requireUser("ADMIN");
  const m = await db.contactMessage.findUnique({ where: { id: str(fd, "id") } });
  if (!m) return fail("Not found");
  await db.contactMessage.update({ where: { id: m.id }, data: { handled: !m.handled } });
  await done(m.handled ? "Marked as open" : "Marked as handled");
}
