import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
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
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  // `lcovonly` (not `lcov`) so we emit only coverage/lcov.info for SonarCloud
  // and skip the HTML report, whose vendored JS would trip `tsc --noEmit`.
  coverageReporters: ["lcovonly", "text"],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
