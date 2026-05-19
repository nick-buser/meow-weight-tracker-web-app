#!/usr/bin/env sh
# Container entrypoint: run Drizzle migrations idempotently, then exec the
# CMD (next.js standalone server.js by default).
#
# Migration failure exits non-zero so Dokploy reports a failed deploy instead
# of a healthy-but-broken container. Matches the swe-interview-prep pattern.

set -eu

if [ -z "${POSTGRES_URL:-}" ]; then
    echo "FATAL: POSTGRES_URL is not set." >&2
    exit 1
fi

echo "[entrypoint] running drizzle migrations"
node ./scripts/run-migrations.mjs

echo "[entrypoint] exec: $*"
exec "$@"
