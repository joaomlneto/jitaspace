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
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  collectCoverage: true,
  // The package's sources are flat at its root, so a single-level glob covers
  // them all while leaving dist/, tests/ and coverage/ out. The negations drop
  // the tooling config files, plus SolarSystemScene.tsx: it mounts the WebGL
  // <Canvas> (React Three Fiber) and needs a GPU context, so it can't run under
  // jsdom — it is coverage-excluded in sonar-project.properties to match.
  collectCoverageFrom: [
    "*.{ts,tsx}",
    "!*.config.ts",
    "!jest.setup.ts",
    "!SolarSystemScene.tsx",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text"],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
