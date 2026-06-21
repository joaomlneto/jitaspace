---
"@jitaspace/web": patch
---

Fixed EVE wars not updating — the scheduled hourly wars sync was crashing on every run with a `ReferenceError`, so war state (start/finish dates, ISK destroyed, etc.) had gone stale.
