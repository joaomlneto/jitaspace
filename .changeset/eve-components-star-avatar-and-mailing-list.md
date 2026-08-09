---
"@jitaspace/eve-components": patch
---

Fix three defects that the package's ~1,000 configuration-induced type errors had been masking.

`SolarSystemSovereigntyAvatar` passed the solar system's `star_id` to `StarAvatar`'s `starId` prop, but that component takes a **type** id — the unknown prop was swallowed by the props spread, so the no-sovereignty fallback silently rendered an empty placeholder instead of the star. It now resolves the star through `useStar` and passes `typeId`, matching how the star avatars are wired everywhere else.

`MailingList` was declared three times over (in the sender anchor, avatar and name modules), making the name ambiguous across the barrel re-exports in `index.ts` (TS2308). It now lives once in `types.ts` and is re-exported from the package root as before.

`CalendarEventOwnerAnchor`'s `ownerType` was typed `string` and forwarded to `EveEntityAnchor`, which accepts only a `ResolvableEntityCategory`. It is now `ResolvableEntityCategory | "eve_server"`, so the `eve_server` branch narrows the rest correctly.
