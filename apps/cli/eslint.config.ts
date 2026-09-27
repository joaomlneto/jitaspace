import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@jitaspace/eslint-config/base";

export default defineConfig(
  {
    ignores: ["dist/**", "out/**"],
  },
  baseConfig,
  restrictEnvAccess,
  {
    // This CLI exists to ingest untyped upstream data — EVE's SDE YAML,
    // hoboleaks and everef JSON — and reshape it. The `no-unsafe-*` family and
    // `no-explicit-any` fire on essentially every transformation step, and the
    // `@ts-ignore` comments they sit alongside are long-standing suppressions
    // in the same code. Relaxing them here is the same tradeoff base.ts already
    // makes for test files, and it keeps the rest of the ruleset live: unused
    // variables, floating and misused promises, import hygiene and
    // turbo/no-undeclared-env-vars all still apply, as does `pnpm type-check`.
    // Typing the SDE ingestion properly would let these come back on.
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
  {
    // The only non-null assertions in this package are five
    // `querySelector(...)!` reads against scraped everef HTML, where the
    // alternative is a null check per element that adds nothing over the
    // existing failure mode. Scoped to this file rather than the package, so
    // an assertion anywhere else in the CLI is still an error.
    files: ["utils/everef.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
