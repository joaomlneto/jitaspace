import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@jitaspace/eslint-config/base";
import { reactConfig } from "@jitaspace/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
  restrictEnvAccess,
  {
    // SolarSystemScene.tsx is a React Three Fiber scene: <mesh>, <group>,
    // <sphereGeometry args={…}>, <meshStandardMaterial emissive={…} /> and
    // friends are three.js objects rendered through R3F's custom reconciler,
    // not DOM elements. `react/no-unknown-property` is DOM-oriented, so it
    // false-positives on every R3F prop (args / position / emissive / attach /
    // intensity / …). SonarQube's S6747 is excluded for the same reason — see
    // sonar-project.properties.
    files: ["**/SolarSystemScene.tsx"],
    rules: {
      "react/no-unknown-property": "off",
    },
  },
);
