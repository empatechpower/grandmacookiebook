/**
 * One-time repair: images uploaded while S3_PUBLIC_URL was wrong (e.g. a placeholder like
 * "https://pub-….r2.dev") were saved under that address. This rewrites every saved R2
 * image address to the correct public URL. Safe to run more than once.
 *
 *   DATABASE_URL="<live url>" S3_PUBLIC_URL="https://pub-<real id>.r2.dev" npm run fix-image-urls
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const base = (process.env.S3_PUBLIC_URL ?? "").trim().replace(/\/$/, "");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to the live database URL");
  const host = (() => { try { return new URL(base).hostname; } catch { return ""; } })();
  if (!/^pub-[0-9a-f]{16,}\.r2\.dev$/.test(host) && !(host && !host.endsWith("r2.dev") && !host.includes(".."))) {
    throw new Error('Set S3_PUBLIC_URL to the bucket\'s real public address, e.g. S3_PUBLIC_URL="https://pub-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d.r2.dev"');
  }
  // Any saved address on an r2.dev host other than the correct one, followed by one of our upload folders.
  const targets: [string, string][] = [["Book", "coverUrl"], ["BookImage", "url"], ["User", "avatarUrl"], ["Media", "url"], ["Article", "coverUrl"]];
  let total = 0;
  for (const [table, col] of targets) {
    const n = await db.$executeRawUnsafe(
      `UPDATE "${table}" SET "${col}" = regexp_replace("${col}", '^https?://[^/]*r2\\.dev', $1) WHERE "${col}" ~ '^https?://[^/]*r2\\.dev/(avatars|covers|media)/' AND "${col}" NOT LIKE $2`,
      base,
      `${base}/%`,
    );
    if (n) console.log(`${table}.${col}: fixed ${n}`);
    total += n;
  }
  console.log(total ? `\nDone — ${total} image address(es) now point to ${base}.` : `\nNothing to fix — all image addresses already point to ${base}.`);
}

main()
  .catch((e) => { console.error(`\n${e instanceof Error ? e.message : e}\n`); process.exitCode = 1; })
  .finally(() => db.$disconnect());
