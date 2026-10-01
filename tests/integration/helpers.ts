/**
 * Shared setup for integration tests. They run against a real Postgres database
 * and reset it with the demo seed, so they refuse to run unless the database
 * name contains "test".
 */
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";
if (!/test/i.test(url.split("?")[0].split("/").pop() ?? "")) {
  throw new Error(`Refusing to run: DATABASE_URL must point at a test database (got "${url.replace(/:[^:@/]+@/, ":***@")}")`);
}
process.env.DATABASE_URL_UNPOOLED ??= url;
// Emails print instead of sending; links in emails need a base URL outside a request.
delete process.env.RESEND_API_KEY;
process.env.APP_URL ??= "http://localhost:3000";

// Keep test output readable: demo emails are printed by the email module; hide them here.
const log = console.log.bind(console);
console.log = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].startsWith("[email]")) return;
  log(...args);
};

export function reseed() {
  execSync("npx prisma db seed", { stdio: "ignore", env: process.env });
}

export const day = (n: number) => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
};
