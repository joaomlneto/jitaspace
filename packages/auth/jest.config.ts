import type { Config } from "jest";

// Provide the env the package expects before any module imports `./env`. Jest
// loads this config in the parent process before spawning workers (which
// inherit `process.env`), so this establishes the contract ahead of any module
// under test. @hapi/iron requires a password of at least 32 characters.
process.env.SKIP_ENV_VALIDATION = "1";
process.env.NEXTAUTH_SECRET = "0123456789abcdef0123456789abcdef";
process.env.EVE_CLIENT_ID = "test-client-id";
process.env.EVE_CLIENT_SECRET = "test-client-secret";

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
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text"],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
