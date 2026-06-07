---
"@jitaspace/web": patch
---

Fix the header user menu's Logout button logging out every authenticated character. It now logs out only the active (selected) character via `removeCharacter`, falling back to one of the remaining characters when others are still signed in and only returning to the home page once the last character is logged out. Logging out also prompts for confirmation before taking effect.
