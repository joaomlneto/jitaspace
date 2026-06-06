---
"@jitaspace/db": minor
---

feat(db): publish @jitaspace/db as a public npm package

Adds tsup build step (CJS + ESM + types), removes private flag, drops postinstall (Turbo pipeline handles db:generate), and moves dotenv to devDependencies.
