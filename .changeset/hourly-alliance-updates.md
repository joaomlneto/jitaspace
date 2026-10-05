---
"@jitaspace/background-jobs": minor
---

Added the hourly `esi-update-alliances` job: refreshes every open alliance and its member corporations from ESI, adds new alliances, and marks closed ones. Alliances it changes are sent to the new `revalidate-alliance-cache` job, which evicts their pages from the web app's cache.
