---
"@jitaspace/hooks": patch
---

`useAuthStore.markCharacterSessionExpired` is now a no-op when the character's session is already flagged expired: it returns the same state object instead of allocating a new one, so subscribers (notably the SSO token-refresh effect keyed on `characters` identity) are not needlessly re-triggered.
