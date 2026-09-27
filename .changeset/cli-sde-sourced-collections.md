---
"@jitaspace/db": patch
---

The `sde-converter` CLI now reads nine collections from CCP's official Static Data Export instead of the hoboleaks mirror: `/universe/expertSystems`, `/universe/schools`, `/universe/schoolMap`, `/characters/skillplans` and the five `/industry/*` endpoints. Generation no longer fails when that community mirror is unreachable.

**This changes the shape of those nine endpoints.** Localized fields (`schools.title`, `skillplans.name`, …) become `{de,en,…}` objects rather than English strings, matching every other SDE-sourced collection; industry payloads move from snake_case to the SDE's camelCase; `expertSystems.skillsGranted` becomes an array of `{typeID, level}` rather than a map, and its records gain a real `typeID` where the mirror had no id field at all; and empty arrays the mirror emitted are now simply absent.

Several fields are also renamed to the SDE's own names: `esHidden`/`esRetired` become `hidden`/`retired`; `activityName` becomes `name`; and the id each record carries changes with its source — `activityID` to `industryActivityID`, `id` to `industryAssemblyLineID`, `assemblyLine` to `assemblyLineID`, `typeId` to `typeID`, `typeListId` to `typeListID`.

`/wallet/accountingEntryTypes` deliberately stays on hoboleaks: the mirror serves 218 entry types and the SDE only 177, so switching would drop 41 of them.
