---
"@jitaspace/background-jobs": patch
---

Fix `updateTable` failing to type-check when handing its rows to `recordsAreEqual`.

`updateTable` constrains its rows to `object`, but `recordsAreEqual` needs a record-like type so it can walk their keys, so passing it straight to `compareSets` raised TS2322 (and again in `@jitaspace/background-jobs-triggerdev`, which compiles these sources). Tightening `updateTable`'s own constraint was rejected: interfaces carry no implicit index signature, so it broke callers whose row type is declared as one. The widening now happens at the call site instead, leaving both public signatures untouched.
