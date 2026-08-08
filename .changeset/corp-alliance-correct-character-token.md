---
"@jitaspace/web": patch
---

Fixed corporation and alliance pages using the wrong character's credentials when you have several characters logged in. Corporation assets, corporation contacts, and alliance contacts could be requested with a character who was not a member of that corporation or alliance, showing another organisation's data or failing outright. These pages now always use a character who actually belongs to the organisation you are viewing, and report that no access is available when none of your logged-in characters do.
