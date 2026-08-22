import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

// `recommended` and `jsx-runtime` each own a top-level `rules` key. Spreading
// both into ONE object literal made the later spread replace the earlier one
// wholesale, so all 22 react/recommended rules were dropped and only
// jsx-runtime's two (both "off") survived — react/jsx-key,
// react/jsx-no-target-blank and the rest were silently disabled everywhere.
// Keep them as separate config objects so ESLint merges them by cascade.
export const reactConfig = defineConfig(
  {
    files: ["**/*.ts", "**/*.tsx"],
    ...reactPlugin.configs.flat.recommended,
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    ...reactPlugin.configs.flat["jsx-runtime"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: {
        React: "writable",
      },
    },
    // Without this, eslint-plugin-react warns on every run and version-gated
    // rules fall back to their most conservative behaviour.
    settings: { react: { version: "detect" } },
    rules: {
      // Prop types are expressed in TypeScript. Leaving this on produces a
      // violation for every typed prop in the repo and catches nothing that
      // tsc does not already reject.
      "react/prop-types": "off",
    },
  },
  reactHooks.configs.flat["recommended-latest"],
  // Must come last within this preset: consumers spread `reactConfig` after
  // `baseConfig`, so React relaxations placed in base.ts would be overridden by
  // `recommended` above.
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
      // Table-driven tests (`it.each([[…, <Component />, …]])`) hold JSX in
      // arrays as *data*, never as a rendered sibling list, so jsx-key is a
      // false positive throughout the suites.
      "react/jsx-key": "off",
      // Mock and fixture components are anonymous by design.
      "react/display-name": "off",
      // renderHook harnesses call hooks from a plain `render()` callback, which
      // the rule reads as a non-component function. The hooks are exercised
      // inside a real React render; the harness just does not look like one.
      "react-hooks/rules-of-hooks": "off",
    },
  },
);
