---
"@jitaspace/web": patch
"@jitaspace/hooks": patch
"@jitaspace/esi-client": patch
---

Fixed changing the ESI language leaving parts of the app in the previous language. Type, region, solar system and faction names kept rendering in the old language until a full page reload; they now switch over with everything else, and switching back is instant because both languages stay cached.
