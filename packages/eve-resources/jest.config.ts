import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
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
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts", "!src/types.ts"],
  coverageDirectory: "coverage",
  // `lcovonly` (not `lcov`) so we skip the HTML report, whose vendored JS would
  // otherwise trip the package's `tsc` type-check (which globs the whole dir).
  coverageReporters: ["text", "lcovonly"],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
