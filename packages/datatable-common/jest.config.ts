import type { Config } from "jest";

// Run west of Greenwich. Local-day logic (filters.ts `toLocalDay`) has bugs
// that only show there: a date-only ISO string parses as UTC midnight, the
// previous local day. Set here, in the parent process, because workers inherit
// it and a test assigning `process.env.TZ` changes only its sandbox's copy.
// The turbo rule guards env a task *reads*, so its cache key covers it. This
// assigns a constant: the task's output never depends on an outside TZ.
// eslint-disable-next-line turbo/no-undeclared-env-vars
process.env.TZ = "America/Los_Angeles";

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
