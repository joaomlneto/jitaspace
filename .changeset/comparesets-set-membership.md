---
"@jitaspace/background-jobs": patch
---

Test set membership in `compareSets` with a `Set` instead of `Array.includes`.
The three linear scans made the diff quadratic in rows per chunk, and
`ingestSdeCompositeTable` chunks by parent id rather than by row count — so the
widest `typeDogma` chunk (148,292 TypeAttribute rows) spent 175.9s in a single
`compareSets` call, about 618s across that one table. The same call now takes
0.09s. Behaviour is unchanged: `Set.has` and `Array.includes` both use
SameValueZero.
