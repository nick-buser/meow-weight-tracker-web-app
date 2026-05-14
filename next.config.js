/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
  // @vercel/blob v2 bundles undici, which ships private-class-field syntax that
  // Next 14's webpack loader can't parse. Keep it as a runtime Node import.
  experimental: {
    serverComponentsExternalPackages: ["@vercel/blob"],
  },
};

export default config;
