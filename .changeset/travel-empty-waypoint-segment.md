---
"@jitaspace/web": patch
---

Fixed the travel planner swapping your origin and destination if you filled in the second waypoint box before the first. The address bar now waits until both are set before updating, instead of writing an incomplete route that moved your choice to the other box.
