"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { done, fail, str } from "@/lib/actions";
import { contactReceived } from "@/lib/notify";

/**
 * Structured request forms (book fairs, book bank) land in the admin contact inbox
 * with the answers laid out as "Label: value" lines, and admins are emailed.
 */
const FORMS = {
  bookfair: {
    topic: "Book fair request",
    back: "/book-fairs",
    fields: [
      ["org", "School / organization"],
      ["dates", "Preferred dates"],
      ["format", "Format"],
      ["grades", "Grades"],
      ["students", "Number of students"],
      ["fundraiser", "Run as a fundraiser"],
      ["notes", "Notes"],
    ],
  },
  bookbankRequest: {
    topic: "Book bank: request books",
    back: "/book-bank",
    fields: [
      ["org", "School / organization"],
      ["location", "Location"],
      ["disaster", "What happened"],
      ["need", "Books needed (ages, quantities)"],
      ["address", "Delivery address"],
    ],
  },
  bookbankDonate: {
    topic: "Book bank: donate books",
    back: "/book-bank",
    fields: [
      ["org", "Author / publisher / organization"],
      ["books", "Books to donate (titles, quantities, ages)"],
      ["location", "Shipping from"],
    ],
  },
} as const;

const Contact = z.object({ name: z.string().trim().min(2, "Enter your name"), email: z.string().trim().email("Enter a valid email") });

export async function submitRequestForm(fd: FormData) {
  const form = FORMS[str(fd, "form") as keyof typeof FORMS];
  if (!form) return fail("Unknown form");
  if (str(fd, "website")) return done("Thanks — we'll be in touch", `${form.back}?sent=1`); // honeypot
  const c = Contact.safeParse({ name: str(fd, "name"), email: str(fd, "email") });
  if (!c.success) return fail(c.error.issues[0].message);
  const lines = form.fields.map(([key, label]) => [label, str(fd, key).slice(0, 2000)] as const).filter(([, v]) => v);
  if (lines.length < 2) return fail("Please fill in the form");
  const body = lines.map(([l, v]) => `${l}: ${v}`).join("\n");
  const msg = { ...c.data, topic: form.topic, body };
  await db.contactMessage.create({ data: msg });
  await contactReceived(msg);
  await done("Thanks — we've received your request and will reply by email", `${form.back}?sent=1`);
}
