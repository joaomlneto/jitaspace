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
          parser: {
            syntax: "typescript",
          },
        },
        module: {
          type: "commonjs",
        },
      },
    ],
  },
  collectCoverage: true,
  collectCoverageFrom: ["layout.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text"],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
