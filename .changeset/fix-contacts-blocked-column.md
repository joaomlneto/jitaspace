---
"@jitaspace/web": patch
---

Fixed the "Blocked" column on the character contacts page (`/contacts/character`) showing the wrong value. Its condition was inverted: contacts with a known blocked status were shown as a dimmed "Unknown", while contacts whose status was actually unknown were shown as "No". The column now shows "Yes"/"No" for contacts with a known blocked status and only shows "Unknown" when the status is unavailable.
