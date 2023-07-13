/** @type {import("eslint").Linter.Config} */
const config = {
  plugins: ["@tanstack/query"],
  extends: [
    "next",
    "turbo",
    "plugin:@tanstack/eslint-plugin-query/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
  ],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "@typescript-eslint/restrict-template-expressions": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports", fixStyle: "inline-type-imports" },
    ],
  },
  ignorePatterns: [
    "**/*.config.js",
    "**/*.config.cjs",
    "packages/eslint-config/**",
  ],
  reportUnusedDisableDirectives: true,
};

module.exports = config;
