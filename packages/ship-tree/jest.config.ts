import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/tests/**/*.test.ts", "<rootDir>/tests/**/*.test.tsx"],
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
  // The library's stylesheet is a side-effect import that Next bundles; jest
  // has no CSS pipeline, so resolve it to an empty module.
  moduleNameMapper: {
    "\\.css$": "<rootDir>/tests/styleMock.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  collectCoverage: true,
  // Sources are flat at the package root, so a single-level glob covers them
  // while leaving tests/, coverage/ and node_modules/ out. The index is a pure
  // barrel and the negations drop the tooling config files.
  collectCoverageFrom: ["*.{ts,tsx,cjs}", "!*.config.ts", "!jest.setup.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text"],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
