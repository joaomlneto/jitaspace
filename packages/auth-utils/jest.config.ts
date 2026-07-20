import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  transform: {
    // Also transform .js so the ESM-only `jose` dependency (carved out of
    // transformIgnorePatterns below) is compiled to CommonJS for Jest.
    "^.+\\.[jt]sx?$": [
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
  // `jose` ships ESM only; let it through the transform instead of ignoring it.
  transformIgnorePatterns: [
    "/node_modules/(?!(\\.pnpm/.*?)?(@jitaspace|jose))",
  ],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text"],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
