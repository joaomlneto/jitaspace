---
"@jitaspace/web": patch
---

Corporation Assets no longer shows "Error! Token not available" when you lack the Director role. Reading corporation assets requires that role, which most members do not have, so the page now says so plainly instead of reporting it as a failure.

It also covers every corporation your logged-in characters can read rather than just the selected character's, with a filter appearing when there is more than one. If one corporation cannot be read, the page names how many and still shows the rest — previously any single failure replaced the whole table.
