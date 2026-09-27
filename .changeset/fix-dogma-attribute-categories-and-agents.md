---
"@jitaspace/web": patch
---

Item attributes are grouped by category again on item pages. The SDE ingest was reading a field name the Static Data Export has never used, so every attribute's category came back empty and the whole list rendered ungrouped.
