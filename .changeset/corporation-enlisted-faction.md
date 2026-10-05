---
"@jitaspace/db": major
"@jitaspace/background-jobs": patch
---

Follow CCP's ESI rename of `faction_id` to `enlisted_faction_id`. `Corporation.factionId` / `faction` now holds the faction an NPC corporation belongs to, from the SDE (`npcCorporations.yaml` `factionID`), and the new `Corporation.enlistedFactionId` / `enlistedFaction` holds the Faction Warfare enlistment that ESI reports. This is breaking: `factionId` keeps its name but changes meaning, so code that read it as an FW enlistment must switch to `enlistedFactionId`.
