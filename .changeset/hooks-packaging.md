---
"@jitaspace/hooks": patch
---

Declare `sideEffects: false`, so importing any hook no longer pulls TanStack DB into the bundle; drop the tsup build, `publishConfig` and `files`, which nothing consumed on this private, source-only package; and rename `useCharacterCurrentLocation.ts` / `useCharacterNotifications.ts` to match the hooks they export. No export names change.
