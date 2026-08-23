import * as path from "node:path";
import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import turboPlugin from "eslint-plugin-turbo";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

/**
 * All packages that leverage t3-env should use this rule
 */
export const restrictEnvAccess = defineConfig({
  files: ["**/*.js", "**/*.cjs", "**/*.mjs", "**/*.ts", "**/*.tsx"],
  // Scoped to THIS config object, not a standalone `{ ignores }` entry: a
  // config whose only key is `ignores` is a GLOBAL ignore in flat config, so
  // the previous form removed every env.ts from all linting rather than just
  // exempting it from the two process.env rules below. env.ts is the one file
  // that legitimately reads process.env — and the one that most needs
  // turbo/no-undeclared-env-vars.
  ignores: [
    "**/env.ts",
    // Build/tooling config and standalone scripts run in plain Node before the
    // validated env module exists — next.config.mjs literally reads
    // process.env.SKIP_ENV_VALIDATION to decide whether to import it, and the
    // Sentry configs initialise before any app module loads.
    "**/*.config.{js,cjs,mjs,ts}",
    "**/scripts/**",
  ],
  rules: {
    "no-restricted-properties": [
      "error",
      {
        object: "process",
        property: "env",
        message:
          "Use `import { env } from '~/env'` instead to ensure validated types.",
      },
    ],
    "no-restricted-imports": [
      "error",
      {
        name: "process",
        importNames: ["env"],
        message:
          "Use `import { env } from '~/env'` instead to ensure validated types.",
      },
    ],
  },
});

export const baseConfig = defineConfig(
  // Ignore files not tracked by VCS and any config files
  includeIgnoreFile(path.join(import.meta.dirname, "../../.gitignore")),
  // `includeIgnoreFile` only reads the root .gitignore; generated client code
  // (kubb output) is excluded via *package-level* .gitignore files, so ignore
  // it explicitly here to keep generated sources out of lint.
  { ignores: ["**/eslint.config.*", "**/src/generated/**"] },
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs", "**/*.ts", "**/*.tsx"],
    plugins: {
      import: importPlugin,
      turbo: turboPlugin,
    },
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      "turbo/no-undeclared-env-vars": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-misused-promises": [
        2,
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        {
          allowConstantLoopConditions: true,
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
      "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
    },
  },
  {
    linterOptions: { reportUnusedDisableDirectives: true },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Build/tooling configuration and standalone scripts. These were previously
  // excluded from lint wholesale by an `**/*.config.*` ignore — which caught
  // real executed code, including next.config.mjs (the CSP, security headers
  // and redirects) and the Sentry init files. They run in plain Node, and Next
  // requires rewrites/redirects/headers to be `async` even with no await.
  {
    files: ["**/*.config.{js,cjs,mjs,ts}", "**/scripts/**/*.{js,cjs,mjs,ts}"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        console: "readonly",
        exports: "writable",
        module: "writable",
        process: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/require-await": "off",
    },
  },
  // Test files legitimately work with `any` (mocked modules), `require()`
  // (mocks must be registered before the unit under test is imported), and
  // non-null assertions on known-present fixtures. Relax the type-safety rules
  // here while keeping them strict on application/library source.
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/tests/**/*.ts",
      "**/tests/**/*.tsx",
      "**/__mocks__/**/*.ts",
      "**/__mocks__/**/*.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
