// Drizzle migration runner — invoked from docker-entrypoint.sh on container
// boot. Equivalent to `drizzle-kit migrate` but doesn't require drizzle-kit
// (a devDependency, not present in the standalone runtime image).

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.POSTGRES_URL;
if (!url) {
  console.error("FATAL: POSTGRES_URL is not set.");
  process.exit(1);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client);

await migrate(db, { migrationsFolder: "./drizzle" });
await client.end();
console.log("[migrate] done");
