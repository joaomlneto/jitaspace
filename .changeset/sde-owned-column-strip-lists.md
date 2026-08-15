---
"@jitaspace/background-jobs": patch
---

Keep the ESI scrapers from rewriting whole tables after the new SDE columns
landed. `updateTable` diffs a local row against an ESI payload by walking the
local row's keys, so a column ESI never supplies has to be stripped first —
`SolarSystem`'s new SDE columns and `DogmaAttribute.attributeCategoryId` were
not, which made every row of both tables diff as modified on every run.
`DogmaAttribute`'s strip list moves next to the others as
`SDE_OWNED_DOGMA_ATTRIBUTE_COLUMNS`, and a new test reads the Prisma schema and
fails when a column of either table is claimed by neither writer.
