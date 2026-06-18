---
"@jitaspace/db": minor
---

Added SDE item-metadata models: `MetaGroup`, `TypeMaterial`, `ContrabandType`, `Certificate` (+ `CertificateSkill`, `CertificateRecommendation`), `Mastery`, `SkinMaterial`, `Skin` (+ `SkinType`), `SkinLicense`, and `TypeList` (+ `TypeListEntry` and the `TypeListRefType` enum), with relations from `Type` and `Faction`. Requires a database migration.
