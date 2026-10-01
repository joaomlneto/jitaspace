---
"@jitaspace/db": patch
---

Index `Type.variationParentTypeId`, so the variations of an item (every type pointing at the same base item) can be looked up without scanning the `Type` table.
