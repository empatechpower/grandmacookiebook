import "server-only";
import { after } from "next/server";

/**
 * Transactional email via Resend's HTTP API (https://resend.com).
 * Without RESEND_API_KEY, emails are printed to the server log instead, so
 * local development and demos work without an email account.
 */
export type Email = { to: string; subject: string; lines: string[]; cta?: { label: string; url: string } };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function render({ lines, cta }: Email) {
  const text = [...lines, ...(cta ? ["", `${cta.label}: ${cta.url}`] : []), "", "— Grandma Cookie Book"].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1b1612;max-width:560px">
${lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join("\n")}
${cta ? `<p style="margin:20px 0"><a href="${esc(cta.url)}" style="background:#c24d1d;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">${esc(cta.label)}</a></p>` : ""}
<p style="margin:24px 0 0;color:#7a7066;font-size:13px">— Grandma Cookie Book · literary marketplace</p></div>`;
  return { text, html };
}

async function deliver(email: Email) {
  const { text, html } = render(email);
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email] to=${email.to} subject="${email.subject}"\n${text}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Grandma Cookie Book <onboarding@resend.dev>", to: email.to, subject: email.subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/**
 * Sends after the response is returned, so a slow or failing email provider
 * never blocks or breaks the action that triggered it.
 */
export function sendEmail(email: Email | Email[]) {
  const list = Array.isArray(email) ? email : [email];
  const send = async () => {
    for (const e of list) {
      try {
        await deliver(e);
      } catch (err) {
        console.error(`[email] failed to=${e.to} subject="${e.subject}":`, err);
      }
    }
  };
  try {
    after(send);
  } catch {
    // Outside a request (scripts, tests): send in the background without blocking.
    void send();
  }
}
