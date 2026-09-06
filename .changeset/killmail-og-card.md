---
"@jitaspace/web": patch
---

Killmail links now unfurl the way zKillboard and EVE-Kill do: the ship's own render as a small thumbnail, with the victim, corporation/alliance, system, attacker count, final blow, and total ISK value in the description — instead of the generic branded card most kill links previously fell back to (the rich card required a `?hash=` query parameter that nothing in the app ever added, so ordinary shared links never got past "Killmail #12345").
