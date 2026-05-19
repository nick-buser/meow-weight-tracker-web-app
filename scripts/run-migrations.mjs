// Drizzle migration runner — invoked from docker-entrypoint.sh on container
// boot. Equivalent to `drizzle-kit migrate` but doesn't require drizzle-kit
// (a devDependency, not present in the standalone runtime image).
//
// NOTE on URL parsing: postgres-js' internal parseUrl calls `new URL(...)`
// which rejects unescaped `/` in the password component (and several other
// characters openssl base64 happily produces). The homelab pipeline can't
// reliably keep percent-encoding intact through Dokploy's env injection
// layer, so we parse the URL manually and hand postgres-js an options
// object instead of a string.

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

function parsePgUrl(url) {
  const m = url.match(
    /^postgres(?:ql)?:\/\/([^:@]+):([^@]*)@([^:/]+)(?::(\d+))?\/([^?]+)(?:\?.*)?$/,
  );
  if (!m) throw new Error(`Invalid POSTGRES_URL shape: ${url}`);
  return {
    username: decodeURIComponent(m[1]),
    password: decodeURIComponent(m[2]),
    host: m[3],
    port: parseInt(m[4] || "5432", 10),
    database: m[5],
  };
}

const url = process.env.POSTGRES_URL;
if (!url) {
  console.error("FATAL: POSTGRES_URL is not set.");
  process.exit(1);
}

const client = postgres({ ...parsePgUrl(url), max: 1 });
const db = drizzle(client);

await migrate(db, { migrationsFolder: "./drizzle" });
await client.end();
console.log("[migrate] done");
