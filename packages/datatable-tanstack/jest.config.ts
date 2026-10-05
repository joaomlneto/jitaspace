import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/tests/**/*.test.tsx", "<rootDir>/tests/**/*.test.ts"],
  transform: {
    // `.js` too: TanStack Table v9 ships ESM only, so its files (let through
    // by transformIgnorePatterns below) are compiled to CommonJS for Jest.
    "^.+\\.[jt]sx?$": [
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
  // Transform ESM packages that need to be compiled
  transformIgnorePatterns: [
    "/node_modules/(?!(@mantine|@tanstack|@jitaspace))",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text"],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
