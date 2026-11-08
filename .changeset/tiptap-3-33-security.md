---
"@jitaspace/tiptap-eve": patch
---

Raise the `@tiptap/*` dependency floor to `^3.33.0`, which includes the fix for GHSA-cp6q-959q-f8rh. All `@tiptap/*` packages move together; mixing versions breaks the extension types.
