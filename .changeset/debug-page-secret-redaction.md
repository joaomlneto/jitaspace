---
"@jitaspace/web": patch
---

The developer /debug page no longer sends secret values to the browser: passwords, tokens and API keys are now shown as a length plus a short checksum, and database/Redis URLs keep only the host and database name.
