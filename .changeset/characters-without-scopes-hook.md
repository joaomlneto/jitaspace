---
"@jitaspace/hooks": minor
---

Added `useCharactersWithoutScopes(scopes)`: the logged-in characters that have not granted every one of `scopes`, or whose session has expired, with the scopes they did grant. Multi-character pages can use it to say which characters they leave out.
