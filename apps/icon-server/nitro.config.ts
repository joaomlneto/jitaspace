import { defineNitroConfig } from "nitropack/config";

// https://nitro.build/config
export default defineNitroConfig({
  compatibilityDate: "2025-01-01",

  // Nitro's default error response, but with cacheable 404s — see error.ts.
  errorHandler: "~/error",

  // On Vercel the `vercel` preset is auto-detected (the VERCEL env var is set),
  // producing a Build Output API bundle in `.vercel/output`. Locally, the
  // default `node-server` preset builds a standalone server at
  // `.output/server/index.mjs` (run it with `pnpm preview`).
});
