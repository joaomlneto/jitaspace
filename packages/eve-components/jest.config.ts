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
  // Static image assets (e.g. the `.gif` files StandingIndicator imports via the
  // transitively-loaded `@jitaspace/ui` barrel) cannot be parsed by the JS
  // transformer; resolve them to a lightweight stub instead.
  moduleNameMapper: {
    "\\.(gif|png|jpe?g|svg|webp|avif)$": "<rootDir>/__mocks__/fileMock.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text"],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
