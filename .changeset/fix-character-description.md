---
"@jitaspace/hooks": patch
"@jitaspace/web": patch
---

Fixed character pages always showing "No description". A character's biography and security status are now read from EVE Online and displayed correctly. Previously the `useCharacter` hook fetched these fields but never passed them through, so every character appeared to have no description.
