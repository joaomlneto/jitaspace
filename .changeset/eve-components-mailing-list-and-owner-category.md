---
"@jitaspace/eve-components": patch
---

fix(eve-components): resolve the ambiguous `MailingList` export and stop forwarding unrecognised calendar owner types as entity categories.

`MailingList` was declared three times (in the `EveMailSender*` anchor, avatar and text components), which made the package's root star-exports ambiguous (TS2308). It now lives once in `types.ts` and is re-exported from `index.ts`; the shape is unchanged.

`CalendarEventOwnerAnchor` passed its `ownerType` string straight through as `EveEntityAnchor`'s `category`. Only `alliance`, `character`, `corporation` and `faction` are resolvable categories, so any other value became a bogus hint to `useEsiName`; unknown owner types now fall back to ID-range inference instead.

`SolarSystemSovereigntyAvatar` also resolves the system's star type before rendering `StarAvatar`, which became presentational when `@jitaspace/ui` was decoupled from the data layer.
