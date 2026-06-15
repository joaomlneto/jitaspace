import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@jitaspace/eslint-config/base";

export default defineConfig(
  {
    // `icons/**` holds machine-generated icon components (one per EVE icon,
    // produced from SDE art). They are excluded from lint like other generated output.
    ignores: ["dist/**", "icons/**"],
  },
  baseConfig,
  restrictEnvAccess,
);
