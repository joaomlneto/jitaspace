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
    // Same scope as restrictEnvAccess, whose `process.env` entry is repeated
    // here: a later config replaces a rule's options rather than merging them.
    ignores: ["**/env.ts", "**/*.config.{js,cjs,mjs,ts}", "**/scripts/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          name: "process",
          importNames: ["env"],
          message:
            "Use `import { env } from '~/env'` instead to ensure validated types.",
        },
        {
          name: "@mantine/core",
          importNames: ["SegmentedControl"],
          message:
            "Use `Segmented` from '~/components/Segmented'. SegmentedControl calls Math.random() while rendering, which drops a prerendered or ISR page's content out of its cached HTML (see apps/web/CLAUDE.md).",
        },
      ],
    },
  },
);
