---
"@jitaspace/db": minor
---

Added reference-data models for the remaining SDE files: `CompressibleType`, `CharacterAttribute`, `CharacterTitle`, `TranslationLanguage`, `Archetype`, `Landmark`, `MapSecondarySun`, `SovereigntyUpgrade`, `PlanetResource`, `TypeBonus` (+ `TypeBonusLine`), `ControlTowerResource`, `DynamicItemAttribute` (+ `DynamicItemAttributeRange`, `DynamicItemAttributeMapping`), `DbuffCollection` (+ `DbuffModifier`), `PlanetSchematic` (+ `PlanetSchematicType`, `PlanetSchematicPin`), `Dungeon` (+ `DungeonAllowedShip`), and `CloneGrade` (+ `CloneGradeSkill`), with the `TypeBonusKind` and `DbuffModifierKind` enums. Cross-entity references are stored as plain integer ids (no foreign keys). Requires a database migration.
