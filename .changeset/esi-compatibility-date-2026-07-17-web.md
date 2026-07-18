---
"@jitaspace/web": patch
---

Updated JitaSpace to EVE's latest ESI API version (compatibility date 2026-07-17), keeping it current with changes CCP shipped since December. Character titles and solar system sovereignty owners keep displaying correctly across known space — EVE renamed and reworked both behind the scenes, and they would otherwise have silently stopped showing. The Server Status page now reports the new compatibility date and can no longer show a stale one.

One small regression rides along with EVE's sovereignty rework: five Drifter-hub wormhole systems (Sentinel MZ, Liberated Barbican, Sanctified Vidette, Conflux Eyrie and Azdaja Redoubt) used to show an NPC-faction owner and now show none, because EVE's new sovereignty data covers only known space. There is no replacement source for those systems.
