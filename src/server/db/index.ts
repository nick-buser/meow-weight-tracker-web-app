import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "~/env";
import * as schema from "./schema";

// Hand-parsed connection options. See scripts/run-migrations.mjs for the
// reason — postgres-js' built-in URL parser rejects unescaped `/`, `+` etc.
// in the password component, and the homelab Dokploy layer can't reliably
// preserve percent-encoding through env injection.
function pgOptionsFrom(url: unknown): postgres.Options<Record<string, never>> {
  // Tests run with SKIP_ENV_VALIDATION=1 and may not set POSTGRES_URL; the
  // tRPC router files import this module so module-load must not throw.
  if (typeof url !== "string" || url.length === 0) return { max: 1 };
  const m = url.match(
    /^postgres(?:ql)?:\/\/([^:@]+):([^@]*)@([^:/]+)(?::(\d+))?\/([^?]+)(?:\?.*)?$/,
  );
  if (!m) return { max: 1 };
  const [, user, pass, host, port, db] = m;
  return {
    max: 1,
    username: decodeURIComponent(user!),
    password: decodeURIComponent(pass!),
    host: host!,
    port: parseInt(port ?? "5432", 10),
    database: db!,
  };
}

const client = postgres(pgOptionsFrom(env.POSTGRES_URL));

export const db = drizzle(client, { schema });
