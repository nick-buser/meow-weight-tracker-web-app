/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
  // Required for the homelab container image: produces a self-contained
  // `.next/standalone/server.js` runtime payload that the Dockerfile copies
  // directly. Without this, the runtime stage would need the full repo +
  // node_modules.
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@vercel/blob"],
  },
};

export default config;
