import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
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
  clearMocks: true,
  restoreMocks: true,
  forceExit: true,
};

export default config;
