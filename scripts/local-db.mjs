/**
 * Runs a local Postgres 17 from node_modules (no Docker or system install needed).
 * Matches the default DATABASE_URL in .env.example. Data lives in ./.postgres.
 * Usage: `npm run db:local` in its own terminal, leave it running; Ctrl+C stops it.
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "fs";

const pg = new EmbeddedPostgres({
  databaseDir: "./.postgres",
  user: "atelier",
  password: "atelier",
  port: 5432,
  persistent: true,
  onLog: () => {},
});

if (!existsSync("./.postgres/PG_VERSION")) {
  console.log("First run: creating the database cluster…");
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase("atelier");
  console.log('Created database "atelier". Next: run `npm run setup` in another terminal.');
} catch {
  // Already exists.
}
console.log("Postgres is running on localhost:5432 (Ctrl+C to stop).");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
