import baseConfig, { restrictEnvAccess } from "@jitaspace/eslint-config/base";
import nextjsConfig from "@jitaspace/eslint-config/nextjs";
import reactConfig from "@jitaspace/eslint-config/react";





/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];
