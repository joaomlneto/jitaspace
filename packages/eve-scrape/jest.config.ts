import type { Config } from "jest";

// The registry tests only exercise the declarative Inngest config (function
// registry), not the runtime env, so skip the zod env validation in
// client/env.ts. Set here (jest loads this config in the parent process before
// spawning workers, which inherit `process.env`) rather than in a setup file,
// so the env contract is established before any module under test is imported.
process.env.SKIP_ENV_VALIDATION = "1";

const config: Config = {
  testEnvironment: "node",
  // Resolve the CJS build of dual-package deps (e.g. `inngest`, whose exports
  // map only has `import`/`require`) so @swc/jest can load them as CommonJS.
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
  collectCoverageFrom: ["adapter.ts", "client.ts"],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
