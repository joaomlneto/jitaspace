---
"@jitaspace/hooks": minor
"@jitaspace/ui": major
---

Decouple `@jitaspace/ui` from `@jitaspace/esi-client`

All UI components that previously fetched their own data (accepting entity IDs and calling ESI hooks internally) have been converted to pure presentational components that accept pre-resolved data as props.

**Breaking changes in `@jitaspace/ui`:**
- `RaceName`, `BloodlineName`, `GroupName`, `CategoryName`, `DogmaAttributeName`, `DogmaEffectName`, `StargateName`, `StarName`, `MoonName`, `PlanetName`, `MarketGroupName`, `AsteroidBeltName` — props changed from `*Id` to `name?: string`
- `WarAggressorName`, `WarDefenderName` — props changed from `warId` to resolved alliance/corporation IDs
- `CalendarEventOwnerName`, `LabelName`, `MailingListName` — props changed to pre-resolved data
- Avatar components (`RaceAvatar`, `StarAvatar`, `StargateAvatar`, `StationAvatar`, `PlanetAvatar`, `SolarSystemStarAvatar`, `StructureAvatar`, `WarAggressorAvatar`, `WarDefenderAvatar`, `CalendarEventOwnerAvatar`) — props changed from entity IDs to `typeId`/`factionId`/resolved IDs
- Badge components (`AllianceTickerBadge`, `CorporationTickerBadge`, `WarAggressorTickerBadge`, `WarDefenderTickerBadge`, `SolarSystemSecurityStatusBadge`, `MailLabelBadge`, `CalendarEventResponseBadge`) — props changed to pre-resolved data
- Anchor/ActionIcon/other components similarly updated

**New in `@jitaspace/hooks`:**
- `useStargate` — fetches stargate data
- `useAsteroidBelt` — fetches asteroid belt data
- `useMoon` — fetches moon data
- `useCorporationAllianceHistory` — fetches corporation alliance history
