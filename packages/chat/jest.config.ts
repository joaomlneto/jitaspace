import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  testEnvironmentOptions: {
    customExportConditions: ["require", "node", "default"],
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts", "<rootDir>/tests/**/*.test.tsx"],
  transform: {
    "^.+\\.tsx?$": [
      "@swc/jest",
      {
        jsc: {
          target: "es2022",
          parser: { syntax: "typescript", tsx: true },
        },
        module: { type: "commonjs" },
      },
    ],
  },
  // `chat`, `@chat-adapter/discord`, and `@chat-adapter/state-redis` are
  // ESM-only packages (their exports map only has "import", no "require").
  // Jest runs in CJS mode and Node's exports resolver throws
  // ERR_PACKAGE_PATH_NOT_EXPORTED for them. We bypass the exports map by
  // pointing directly at the dist entry point.
  moduleNameMapper: {
    "^chat$":
      "<rootDir>/../../node_modules/chat/dist/index.js",
    "^@chat-adapter/discord$":
      "<rootDir>/../../node_modules/@chat-adapter/discord/dist/index.js",
    "^@chat-adapter/state-redis$":
      "<rootDir>/../../node_modules/@chat-adapter/state-redis/dist/index.js",
  },
  transformIgnorePatterns: ["/node_modules/(?!(@jitaspace))"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["lcovonly", "text"],
  collectCoverageFrom: ["index.tsx"],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
