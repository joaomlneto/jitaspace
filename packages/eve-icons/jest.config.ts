import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/tests/**/*.test.tsx", "<rootDir>/tests/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "@swc/jest",
      {
        jsc: {
          target: "es2022",
          parser: {
            syntax: "typescript",
            tsx: true,
          },
          transform: {
            react: {
              runtime: "automatic",
            },
          },
        },
        module: {
          type: "commonjs",
        },
      },
    ],
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  collectCoverage: true,
  // The generated components are data, not logic: covering them would only
  // dilute the numbers for the code that matters.
  coveragePathIgnorePatterns: ["/node_modules/", "/src/generated/"],
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text-summary"],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
