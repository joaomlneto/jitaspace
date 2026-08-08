---
"@jitaspace/esi-metadata": patch
"@jitaspace/db": patch
---

The `type-check` script no longer passes `--jsx react-jsx` on the command line. Neither package contains JSX or resolves any `.tsx` source, so the flag was a no-op; where the setting is genuinely needed it now lives in the package's `tsconfig.json`, which keeps editors and `tsc` in agreement. No change to emitted output.
