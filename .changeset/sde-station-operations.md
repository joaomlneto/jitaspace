---
"@jitaspace/db": minor
---

Added `StationOperation` (+ `StationOperationService`, `StationOperationStationType`) models for the full `stationOperations.yaml` definition (services, activity, placement/manufacturing/research factors, per-race station types) — previously only the operation name was used, to build `Station.name`. Requires a database migration.
