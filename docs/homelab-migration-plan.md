# Homelab Migration Plan — meow-weight-tracker

Onboard the cat weight tracker (`meow-weight-tracker-web-app` repo,
slug `meow-weight-tracker` on the homelab side) onto the homelab
pipeline. Single Next.js app with a tRPC backend served from the same
process — simplest possible Dokploy shape (one slot per env).

Read `~/Projects/homelab/proxmox/homelab_infra_and_planning/.claude/skills/homelab-migrate/SKILL.md`
first; this doc only captures the meow-specific bits.

## Decisions

| Decision | Value |
|---|---|
| Owner | `nick-b` |
| Gitea repo name | `meow-weight-tracker` (drop the redundant `-web-app` suffix when minting on Gitea) |
| App slug | `meow-weight-tracker` / `meow_weight_tracker` |
| Stack template | `scripts/templates/woodpecker-app/node-fullstack/` (Next.js shape, tRPC server inside) |
| Service shape | **Single Dokploy slot per env** — one Next.js process. |
| URL pattern | `meow-weight-tracker.app.lab` (prod), `meow-weight-tracker-dev.app.lab` (dev) + `.app.bittern-chameleon.dev` aliases |
| Dual-pipeline | Repo is **GitHub-only** today. Add Gitea remote as part of Phase 1. |

## Phase deltas

1. **Phase 1 (Gitea)**: mint the Gitea repo (`tea repo create` or via
   API). Push history. Set `origin` to Gitea, rename existing
   GitHub-tracking remote to `github`.
2. **Phase 3 (Dockerfile)**: Next.js with `output: "standalone"` in
   `next.config.mjs` makes for a much smaller image. The tRPC server
   runs in the same process; one `node server.js` (or equivalent
   `next start` if no custom server) at runtime.
3. **Phase 4 (`.woodpecker.yml`)**: single-service node-fullstack
   template.
4. **Phase 5 (Dokploy)**: stock single-app.
5. **Phase 6 (dev-workshop)**: `meow-weight-tracker.env.dev.j2`. Env:
   `DATABASE_URL`, any tRPC / Next.js `NEXT_PUBLIC_*` build args.
   Note `next.config.mjs` imports `./src/env.js` for validation — that
   needs the env to be set at build time for `NEXT_PUBLIC_*`, runtime
   for everything else.

## App-specific TODOs

- [ ] Enable Next.js `output: "standalone"` if not already.
- [ ] Confirm DB migration tooling (Drizzle? Prisma?) and wire into
      the docker-entrypoint.
- [ ] `NEXT_PUBLIC_*` build args need to be passed to the Docker build
      via `--build-arg` (in `.woodpecker.yml` plugin settings) — these
      are baked into the bundle at build time.
- [ ] `SKIP_ENV_VALIDATION` build-arg for the build stage so the env
      validator in `src/env.js` doesn't fail during Dockerfile build.

## Deferred

- Phase 7 / Phase 8 — defer.
- Phase 9 — once Gitea remote is minted, dual-pipeline is automatic.
