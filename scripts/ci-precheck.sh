#!/usr/bin/env bash
# ci-precheck: fast local sanity for the CI definition.
#
# Catches the 1-second-fixable problems that otherwise burn a 7-minute
# Woodpecker cycle: malformed YAML, deprecated v2 step syntax, plugin
# image typos, references to secrets the Woodpecker server doesn't have.
#
# Designed to be runnable in <2 seconds locally before you push. Lifts
# the validation loop from "wait for the pipeline" to "wait for sed."
# Postmortem (homelab docs/incidents/009) § P3 is the reason this
# exists.
#
# Usage:
#   make ci-precheck                       # default
#   ./scripts/ci-precheck.sh
#
# Env overrides:
#   WP_URL                  Woodpecker base URL (default https://ci.lab)
#   WP_TOKEN                Woodpecker PAT for /api/secrets probe (optional)
#                           — without it the secret-existence check skips.
#   YAML_FILE               Override the woodpecker file (default
#                           .woodpecker.yml).

set -uo pipefail

YAML_FILE="${YAML_FILE:-.woodpecker.yml}"
WP_URL="${WP_URL:-https://ci.lab}"
WP_TOKEN="${WP_TOKEN:-}"

PASS=0
FAIL=0

red()  { printf '\033[0;31m%s\033[0m' "$*"; }
grn()  { printf '\033[0;32m%s\033[0m' "$*"; }
ylw()  { printf '\033[0;33m%s\033[0m' "$*"; }

ok()   { PASS=$((PASS+1)); printf '  %s %s\n' "$(grn '✓')" "$*"; }
bad()  { FAIL=$((FAIL+1)); printf '  %s %s\n' "$(red '✗')" "$*"; }
skip() {              printf '  %s %s\n' "$(ylw '○')" "$*"; }

# --- 1. File present + YAML parses ---
echo "$(grn parse:)"
if [[ ! -f "$YAML_FILE" ]]; then
    bad "$YAML_FILE not found"
    exit 1
fi
if ! uv run --quiet --with pyyaml python -c "import yaml,sys; yaml.safe_load(open('$YAML_FILE'))" 2>/dev/null; then
    bad "$YAML_FILE is not valid YAML"
    uv run --quiet --with pyyaml python -c "import yaml; yaml.safe_load(open('$YAML_FILE'))" 2>&1 | sed 's/^/    /'
    exit 1
fi
ok "$YAML_FILE parses as YAML"

# --- 2. v2 syntax regressions ---
echo "$(grn syntax:)"
# Bare `secrets: [...]` on a step is v2-only — Woodpecker 3 rejects.
if grep -nE '^[[:space:]]*secrets:[[:space:]]*\[' "$YAML_FILE" >/dev/null 2>&1; then
    bad "step uses v2 \`secrets: [...]\` syntax — Woodpecker 3 wants \`environment.VAR.from_secret\`"
    grep -nE '^[[:space:]]*secrets:[[:space:]]*\[' "$YAML_FILE" | sed 's/^/    /'
else
    ok "no v2 \`secrets: […]\` step syntax"
fi
# Bare list under `secrets:` block (multi-line v2 form).
if uv run --quiet --with pyyaml python -c "
import yaml,sys
d = yaml.safe_load(open('$YAML_FILE'))
bad = []
for name, step in (d.get('steps') or {}).items():
    if isinstance(step, dict) and isinstance(step.get('secrets'), list):
        bad.append(name)
sys.exit(1 if bad else 0)
print(','.join(bad))
" 2>/dev/null; then
    ok "no v2 \`secrets:\` list under any step"
else
    bad "v2 \`secrets:\` list found under: $(uv run --quiet --with pyyaml python -c "
import yaml
d = yaml.safe_load(open('$YAML_FILE'))
print(','.join(n for n,s in (d.get('steps') or {}).items() if isinstance(s, dict) and isinstance(s.get('secrets'), list)))
")"
fi

# --- 3. Plugin image freshness ---
echo "$(grn images:)"
if grep -nE 'image:[[:space:]]*woodpeckerci/plugin-docker:' "$YAML_FILE" >/dev/null 2>&1; then
    bad "uses deprecated woodpeckerci/plugin-docker (use plugin-docker-buildx)"
else
    ok "no deprecated woodpeckerci/plugin-docker references"
fi

# --- 4. Secret references actually exist (best-effort, needs WP_TOKEN) ---
echo "$(grn secrets:)"
SECRETS_REFERENCED=$(uv run --quiet --with pyyaml python -c "
import yaml, sys, json
d = yaml.safe_load(open('$YAML_FILE'))
seen = set()
def walk(node):
    if isinstance(node, dict):
        if 'from_secret' in node and isinstance(node['from_secret'], str):
            seen.add(node['from_secret'])
        for v in node.values(): walk(v)
    elif isinstance(node, list):
        for v in node: walk(v)
walk(d)
print('\n'.join(sorted(seen)))
")
if [[ -z "$WP_TOKEN" ]]; then
    skip "WP_TOKEN unset — skipping live secret-existence probe"
    if [[ -n "$SECRETS_REFERENCED" ]]; then
        echo "    secrets referenced: $(echo "$SECRETS_REFERENCED" | tr '\n' ' ')"
    fi
else
    HAVE=$(curl -fsSL -H "Authorization: Bearer $WP_TOKEN" "$WP_URL/api/secrets" 2>/dev/null \
            | uv run --quiet --with pyyaml python -c "import json,sys;[print(s['name']) for s in json.load(sys.stdin)]" 2>/dev/null \
            | sort -u)
    MISSING=""
    for name in $SECRETS_REFERENCED; do
        if ! echo "$HAVE" | grep -qx "$name"; then
            MISSING="$MISSING $name"
        fi
    done
    if [[ -n "$MISSING" ]]; then
        bad "secrets referenced in $YAML_FILE but absent from Woodpecker:$MISSING"
    else
        ok "all $(echo "$SECRETS_REFERENCED" | wc -l | tr -d ' ') referenced secrets exist on $WP_URL"
    fi
fi

# --- 5. .deploy-target shape (optional) ---
echo "$(grn deploy-target:)"
if [[ -f ".deploy-target" ]]; then
    if uv run --quiet --with pyyaml python -c "
import yaml, sys
d = yaml.safe_load(open('.deploy-target')) or {}
errs = []
for env, cfg in d.items():
    if not isinstance(cfg, dict):
        errs.append(f'{env}: not a dict')
        continue
    if 'app' in cfg and 'apps' in cfg:
        errs.append(f'{env}: has both \`app\` and \`apps\` (pick one)')
    if 'app' not in cfg and 'apps' not in cfg:
        errs.append(f'{env}: missing \`app\` or \`apps\`')
sys.exit(0 if not errs else 1)
"; then
        ok ".deploy-target shape OK"
    else
        bad ".deploy-target malformed"
    fi
else
    skip "no .deploy-target (not all apps need one)"
fi

# --- summary ---
echo
if (( FAIL == 0 )); then
    printf '%s  %d checks passed\n' "$(grn 'PRECHECK PASS:')" "$PASS"
    exit 0
else
    printf '%s  %d failed / %d total\n' "$(red 'PRECHECK FAIL:')" "$FAIL" "$((PASS+FAIL))"
    exit 1
fi
