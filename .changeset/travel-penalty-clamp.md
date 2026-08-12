---
"@jitaspace/web": patch
---

Fixed the Travel Planner accepting out-of-range security penalties from a hand-edited or shared link. A negative penalty made the route finder produce a wildly wrong path (a 49-jump route became 323 jumps) while the on-screen slider still showed zero; penalties from the URL are now clamped to the same 0–500 range the sliders allow.
