---
"@jitaspace/web": patch
"@jitaspace/hooks": patch
---

Item names now load faster, especially on large asset lists, and one failed lookup no longer leaves every other name blank. The compare page no longer shows an empty table when a single item fails to load, and moving between items on the market page stops the previous item's downloads instead of letting them finish in the background.
