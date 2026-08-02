---
"@jitaspace/web": patch
---

The market page sidebar now loads without hitting the EVE data services. The market tree and its icons all arrive with the page, so opening a market item no longer fires dozens of background requests, and expanding a group is instant instead of showing icons that pop in one by one.
