/**
 * Prepares the production database for launch: creates the owner's super admin account,
 * with no demo data. Run once, from your computer, against the live database:
 *
 *   DATABASE_URL="<live url>" ADMIN_EMAIL="owner@example.com" ADMIN_NAME="Jane Smith" npm run launch
 *
 * It prints a temporary password; the owner signs in and changes it under Settings.
 *
 * If the database already has accounts (e.g. demo data from testing), it stops. To clear
 * EVERYTHING first (all users, orders, bookings, invoices…), add: -- --wipe
 * and confirm with CONFIRM_WIPE=southtexasbookanauthor.
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const wipe = process.argv.includes("--wipe");
const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const name = (process.env.ADMIN_NAME ?? "").trim();

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to the live database URL");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Set ADMIN_EMAIL, e.g. ADMIN_EMAIL="owner@example.com"');
  if (name.length < 2) throw new Error('Set ADMIN_NAME, e.g. ADMIN_NAME="Jane Smith"');

  const users = await db.user.count();
  if (users && !wipe) {
    const [orders, bookings] = await Promise.all([db.order.count(), db.booking.count()]);
    throw new Error(
      `This database already has ${users} account(s), ${orders} order(s) and ${bookings} booking(s). Nothing was changed.\n` +
        `To erase everything and start clean, run again with "-- --wipe" and CONFIRM_WIPE=southtexasbookanauthor.`,
    );
  }
  if (wipe) {
    if (process.env.CONFIRM_WIPE !== "southtexasbookanauthor") throw new Error("Wiping needs CONFIRM_WIPE=southtexasbookanauthor");
    const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
    // Same first numbers as a fresh install: O-2201, B-1041, INV-1001.
    await db.$executeRawUnsafe(`ALTER SEQUENCE "Order_number_seq" RESTART WITH 2201`);
    await db.$executeRawUnsafe(`ALTER SEQUENCE "Booking_number_seq" RESTART WITH 1041`);
    await db.$executeRawUnsafe(`ALTER SEQUENCE "Invoice_number_seq" RESTART WITH 1001`);
    console.log(`Erased all data (${tables.length} tables).`);
  }

  const password = randomBytes(9).toString("base64url");
  await db.user.create({ data: { name, email, role: "ADMIN", status: "ACTIVE", passwordHash: await bcrypt.hash(password, 10) } });
  console.log(`\nSuper admin created.\n  Email:              ${email}\n  Temporary password: ${password}\n`);
  console.log("Sign in at /login, then change the password under Settings. Commission and other settings use the defaults until changed in Settings.");
}

main()
  .catch((e) => {
    console.error(`\n${e instanceof Error ? e.message : e}\n`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
