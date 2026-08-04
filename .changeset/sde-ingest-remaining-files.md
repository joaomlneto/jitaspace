---
"@jitaspace/db": minor
"@jitaspace/background-jobs": minor
---

Ingest every remaining EVE Online SDE file. 78 of the 79 files the SDE ships are
now persisted (the 80th, `_sde.yaml`, is build metadata rather than entity data),
up from 58.

**`@jitaspace/db`** — 33 new models across six families. Cross-entity ids are
plain `Int` columns rather than relations, matching
`StationOperationService.serviceId`: these tables reference a wide spread of
entities and a relation per id would need a back-relation on every referenced
model. Requires a schema push.

- **Missions** — `Mission`, `MissionMessage` (the dotted `messages` map),
  `MissionExtraStanding`. The single-object `killMission`, `courierMission` and
  `missionRewards` are flattened into prefixed columns, as `MetaGroup` does for
  `color`.
- **Epic arcs** — `EpicArc`, `EpicArcMission`, `EpicArcMissionNext` (the
  branching `nextMissions` edges).
- **Ship tree** — `ShipTreeElement`, `ShipTreeFaction(+Element)`,
  `ShipTreeGroup(+Element, +PreReqSkill)`, `TypeElement`. `ShipTreeGroup` is what
  the existing `Type.shipTreeGroupId` column points at.
- **Graphic material sets** — `GraphicMaterialSet`, the target of the existing
  `Graphic.sofMaterialSetId` and `SkinMaterial.materialSetId`. Its four RGBA
  colours are flattened into prefixed columns.
- **Military campaigns** — `MilitaryCampaign(+Annotation)`,
  `MilitaryCampaignObjective(+Tag, +Parameter, +ParameterValue)`. Both files are
  UUID-keyed, so the primary keys are `String`. Campaign annotations are stored
  key/value: CCP ships ~44 per campaign, mostly `res:/…` asset paths, and adds
  more over time. Matcher values are keyed by ordinal (like
  `DogmaEffectModifier.modifierIndex`) because a matcher entry can carry a
  `valueType` with no `values`.
- **SKINR** — 13 models for the SKIN designer: components, categories, rarities,
  point values, slots, slot categories/names/configurations, tier thresholds.

**`@jitaspace/background-jobs`** — 18 new `ingest-sde-*` jobs, added to
`SDE_INGEST_JOB_IDS` in foreign-key order: ship-tree groups before SKINR tier
thresholds, missions before epic arcs, campaigns before objectives, and SKINR
categories/rarities before components and point values. Optional foreign keys are
guarded against their target file the way `ingestSdeTypes` guards `graphicID`.

Note that these files are ingested but not yet tracked in the change-history
database — `Collection` rows and the historical diffs are produced by the
upstream ingestion pipeline, which owns the `eve-builds` schema.
