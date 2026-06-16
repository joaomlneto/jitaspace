import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  testEnvironmentOptions: {
    customExportConditions: ["require", "node", "default"],
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  setupFiles: ["<rootDir>/jest.setup.ts"],
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
