# @jitaspace/web

## 0.4.0 — 2026-05-31

- ecfc186: Replace `next-auth` with a self-hosted EVE Online SSO OAuth2 flow (authorization code + PKCE).
- fff3405: Show ESI compatibility date freshness indicator on status page
- 0c89f53: Serve `/market/<typeId>` from a single static shell instead of an optional catch-all route. The selected type is now read from the path on the client (`usePathname`) and the pretty URL is preserved via a Next.js rewrite, so every market URL is answered by one prerendered page instead of an on-demand, per-type server render. This eliminates the per-type serverless invocations and ISR cache writes that dominated hosting cost, and removes the cascading market-sidebar database query load they triggered.
- 8d8b388: Reworked how EVE entity details are loaded across the site. The names, portraits, avatars, tickers and badges shown for characters, corporations, alliances, factions, item types, stations, structures, solar systems and more are now fetched by the app itself and passed into a shared, presentation-only component library.
- Updated dependencies [4c46749]
- Updated dependencies [070b967]
- Updated dependencies [ecfc186]
- Updated dependencies [13f2f2a]

## 0.3.0 — 2026-05-25

- d197156: Re-enable and fix the main Spotlight search
- Updated dependencies [d197156]

## 0.2.5 — 2026-05-25

- Updated dependencies [b659f2d]

## 0.2.4 — 2026-05-25

- Upgrade zustand from v4 to v5 and fix infinite re-render loops caused by selectors returning new array/object references.
- Updated dependencies

## 0.2.3 — 2026-05-25

- Updated dependencies

## 0.2.2 — 2026-05-25

- 8ef64b2: Remove debug data from the EVEMail Compose form, which was accidentally left in.

## 0.2.1 — 2026-05-25

- Updated dependencies [7859f5d]

## 0.2.0 — 2026-05-25

- dbaf525: Added a /changelog page where users can see what has changed in the app
- Updated dependencies [fb317df]

## 0.1.1

### Patch Changes

- Updated dependencies [6134ff7]
  - @jitaspace/tiptap-eve@0.1.1
