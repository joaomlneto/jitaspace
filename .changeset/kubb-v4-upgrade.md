---
"@jitaspace/web": patch
"@jitaspace/eve-scrape": patch
---

Upgrade the Kubb API-client generator from v3 to v4 (`4.38.0`) across all five generated client packages (esi-client, sde-client, evekill-client, evetycoon-client, fuzzworks-market-client). The generated public API is preserved: `enumTypeSuffix: ""` keeps the existing `…Enum` type names (v4 defaults to a `Key` suffix), and the custom ESI client now exports the `Client` type that v4-generated code imports. The obsolete `@kubb/react` dependency was dropped (v4 plugins use `@kubb/react-fabric` internally).

Two v4 codegen bugs that affected the ESI schema — object-array response types collapsing to a bare enum array (e.g. `UniverseNamesPost`, character/corporation assets, contacts, market orders), and private-identifier-shaped enum keys (e.g. mail-label colours like `#ccff9a`) being emitted unquoted — were fixed upstream ([kubb-labs/kubb#3475](https://github.com/kubb-labs/kubb/pull/3475), [#3476](https://github.com/kubb-labs/kubb/pull/3476)) and ship in `@kubb/plugin-ts@4.38.0`, so no local patch is required.
