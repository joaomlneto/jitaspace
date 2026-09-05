---
"@jitaspace/web": patch
---

Fixed the app retrying forever when an EVE login was revoked. If you removed
JitaSpace's authorization in EVE, or changed your password, the affected
character's session could no longer be renewed — but the app kept retrying the
renewal every 30 seconds instead of telling you. That character is now marked as
needing you to log in again, as it already was for logins that simply aged out.
