#!/usr/bin/env bash
# Curl-based smoke test for a deployed meow-weight-tracker slot.
#
# Hits substrate (healthz when implemented), the marketing/home page,
# and the protected /dashboard route (expects redirect to Clerk sign-in).
#
# Usage:
#   scripts/smoke-deployed.sh                                  # default: dev
#   TARGET=https://meow-weight-tracker.app.lab scripts/smoke-deployed.sh

set -uo pipefail

TARGET="${TARGET:-https://meow-weight-tracker-dev.app.lab}"
PASS=0
FAIL=0

red() { printf '\033[0;31m%s\033[0m' "$*"; }
grn() { printf '\033[0;32m%s\033[0m' "$*"; }

ok()  { PASS=$((PASS+1)); printf '  %s %s\n' "$(grn '✓')" "$*"; }
bad() { FAIL=$((FAIL+1)); printf '  %s %s\n' "$(red '✗')" "$*"; }

require_status() {
    local url="$1" want="$2" label="$3"
    local got
    got=$(curl -sS -o /dev/null -w "%{http_code}" -m 10 "$url" 2>/dev/null || echo "000")
    if [[ "$got" == "$want" ]]; then
        ok "$label  ($want)"
    else
        bad "$label  (want $want, got $got)  url=$url"
    fi
}

require_status_in() {
    local url="$1" want_csv="$2" label="$3"
    local got
    got=$(curl -sS -o /dev/null -w "%{http_code}" -m 10 "$url" 2>/dev/null || echo "000")
    if [[ ",$want_csv," == *",$got,"* ]]; then
        ok "$label  ($got)"
    else
        bad "$label  (want one of $want_csv, got $got)  url=$url"
    fi
}

echo "TARGET=$TARGET"
echo

# 1. Root / home page — public, should 200
require_status "$TARGET/"                          "200"      "GET /"
# 2. /dashboard — Clerk-protected; accepts 200 (Clerk renders sign-in inline)
#    OR 307/302 (Clerk redirect to /sign-in).
require_status_in "$TARGET/dashboard"              "200,302,307" "GET /dashboard (clerk-protected)"
# 3. _next/static asset path — Next.js serves these directly
require_status_in "$TARGET/_next/static/css"       "404,403"  "GET /_next/static/css (no such file but path serves)"
# 4. Favicon
require_status_in "$TARGET/favicon.ico"            "200,404"  "GET /favicon.ico"

echo
if (( FAIL == 0 )); then
    printf '%s  %d checks passed\n' "$(grn 'SMOKE PASS:')" "$PASS"
    exit 0
else
    printf '%s  %d failed / %d total\n' "$(red 'SMOKE FAIL:')" "$FAIL" "$((PASS+FAIL))"
    exit 1
fi
