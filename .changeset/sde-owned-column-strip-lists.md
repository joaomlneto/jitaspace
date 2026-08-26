---
"@jitaspace/background-jobs": patch
---

Keep the ESI scrapers from rewriting whole tables after the new SDE columns
landed. `updateTable` diffs a local row against an ESI payload by walking the
local row's keys, so a column ESI never supplies has to be stripped first —
`SolarSystem`'s new SDE columns and `DogmaAttribute.attributeCategoryId` were
not, which made every row of both tables diff as modified on every run.

`DogmaAttribute`'s strip list moves next to the others as
`SDE_OWNED_DOGMA_ATTRIBUTE_COLUMNS`, and the ESI row builders for
`SolarSystem`, `Planet`, `Moon` and `DogmaAttribute` are now typed
`Omit<Model, timestamps | SDE-owned>`, the same compile-time guard
`EsiCorporationRow` already gave `Corporation`: a new column on one of those
models is a type error until it is either supplied from ESI or listed as
SDE-owned. A test covers the drift `Omit` cannot see — an entry left behind
after its column is renamed or dropped.
