import baseConfig from "@jitaspace/eslint-config/base";
import reactConfig from "@jitaspace/eslint-config/react";





/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [],
  },
  ...baseConfig,
  ...reactConfig,
];
