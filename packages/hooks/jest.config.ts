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
  // Transform ESM packages that need to be compiled
  transformIgnorePatterns: [
    "/node_modules/(?!(@mantine|@tabler|@jitaspace|@tiptap))",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  collectCoverage: true,
  // Without this Jest only instruments files a test happens to import, so an
  // untested hook is absent from lcov.info rather than reported at 0% — the
  // headline number covered roughly a quarter of the package. `kubb/` is
  // listed because this also RESTRICTS coverage to what it matches, and
  // multiEsiEndpoints.ts is tested. Generated hooks are gitignored build
  // output, not source.
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "kubb/**/*.ts",
    "!src/**/*.d.ts",
    "!src/generated/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text"],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
