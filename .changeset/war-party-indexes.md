---
"@jitaspace/db": patch
---

Index each `War` party column together with `declaredDate`, and index `AllianceWarAlly` and `CorporationWarAlly` by the ally, so a party's most recent wars are read from an index instead of a scan.
