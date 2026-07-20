import type { Config } from "jest";

// The registry/core tests only exercise the declarative job config (ids,
// triggers), not the runtime env, so skip the zod env validation in env.ts.
// Set here (in the lint-exempt jest config that runs in the main process) so
// the value is inherited by the forked test workers before any module imports
// env.ts.
process.env.SKIP_ENV_VALIDATION = "1";

const config: Config = {
  testEnvironment: "node",
  testEnvironmentOptions: {
    customExportConditions: ["require", "node", "default"],
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "@swc/jest",
      {
        jsc: {
          target: "es2022",
          parser: { syntax: "typescript", tsx: false },
        },
        module: { type: "commonjs" },
      },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!(@jitaspace))"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  // `lcovonly` (not `lcov`) so we emit only coverage/lcov.info for SonarCloud
  // and skip the HTML report, whose vendored JS would trip the package's
  // checkJs type-check.
  coverageReporters: ["lcovonly", "text"],
  collectCoverageFrom: ["core/**/*.ts", "jobs/**/*.ts", "utils/**/*.ts"],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
