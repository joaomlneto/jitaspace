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
  // SolarSystemScene.tsx mounts the WebGL <Canvas> (React Three Fiber) and needs
  // a GPU context, so it can't run under jsdom — it is coverage-excluded in
  // sonar-project.properties instead. layout.ts and the thin SolarSystemMap
  // wrapper (Scene mocked away) are the testable surface.
  collectCoverageFrom: ["layout.ts", "SolarSystemMap.tsx"],
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text"],
  clearMocks: true,
  restoreMocks: true,
};

export default config;
