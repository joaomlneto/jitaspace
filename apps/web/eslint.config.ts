import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@jitaspace/eslint-config/base";
import { nextjsConfig } from "@jitaspace/eslint-config/nextjs";
import { reactConfig } from "@jitaspace/eslint-config/react";

export default defineConfig(
  {
    // Cypress files run under Cypress's own runner/tsconfig (they use the
    // `cy`/`Cypress` globals and are excluded from the app tsconfig, so the
    // type-aware parser can't resolve them), so keep them out of the app lint.
    // Note this means cypress/e2e/smoke.cy.ts is neither linted nor
    // type-checked — worth revisiting if that suite grows.
    ignores: [".next/**", "cypress/**", "**/*.cy.ts", "**/*.cy.tsx"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
  {
    // A plain next/link prefetches its destination as soon as it scrolls into
    // view, at several segment requests each. Links repeated across pages or
    // lists made that the site's biggest source of CDN requests, so every link
    // goes through HoverPrefetchLink, which waits for hover, touch or focus.
    // `@typescript-eslint/` rather than the core rule, so this does not replace
    // the base config's `process.env` restriction; type imports stay allowed.
    files: ["**/*.ts", "**/*.tsx"],
    ignores: [
      "components/Link/HoverPrefetchLink.tsx",
      "tests/**",
      "__mocks__/**",
    ],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              allowTypeImports: true,
              message:
                "Use `HoverPrefetchLink` from `~/components/Link`: a plain next/link prefetches on sight, which costs CDN requests on every page view.",
            },
          ],
        },
      ],
    },
  },
);
