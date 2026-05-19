import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "~/env";
import * as schema from "./schema";

// Hand-parsed connection options. See scripts/run-migrations.mjs for the
// reason — postgres-js' built-in URL parser rejects unescaped `/`, `+` etc.
// in the password component, and the homelab Dokploy layer can't reliably
// preserve percent-encoding through env injection.
function parsePgUrl(url: string) {
  const m = url.match(
    /^postgres(?:ql)?:\/\/([^:@]+):([^@]*)@([^:/]+)(?::(\d+))?\/([^?]+)(?:\?.*)?$/,
  );
  if (!m) throw new Error(`Invalid POSTGRES_URL shape: ${url}`);
  const [, user, pass, host, port, db] = m;
  return {
    username: decodeURIComponent(user!),
    password: decodeURIComponent(pass!),
    host: host!,
    port: parseInt(port ?? "5432", 10),
    database: db!,
  };
}

const client = postgres({ ...parsePgUrl(env.POSTGRES_URL), max: 1 });

export const db = drizzle(client, { schema });
