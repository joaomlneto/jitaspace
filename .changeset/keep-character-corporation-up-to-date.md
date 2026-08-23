---
"@jitaspace/web": patch
---

Fixed corporation and alliance pages still using your old corporation after you change corp. Your character's corporation and alliance are now re-checked every hour while you are signed in, instead of only when you sign in again — so corporation assets, contacts and other corporation pages follow you to your new corp.

When you have several characters in the same corporation, pages that need a specific corporation role (such as corporation assets, which needs Director) now pick a character who actually holds it, rather than whichever character happened to come first.

Those pages rely on the "Read character corporation roles" permission to tell which of your characters holds the role. If you have not granted it for a character, that character counts as holding no roles and will not be used for them.
