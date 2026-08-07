---
"@jitaspace/web": patch
---

Internal: type the Jest mocks in the web test suite so `pnpm type-check` passes. No change to the app itself.

156 type errors were confined to `apps/web/tests`. Almost all came from bare `jest.fn()` mocks: with no type argument the mock has no parameters, so `mockResolvedValue`/`mockReturnValue` want `never`, forwarding `(...args)` into the mock is not a valid spread, and `toHaveBeenCalledWith(…)` reports "expected 0 arguments". Each mock now carries a signature, following the `jest.fn<() => T>()` convention already used elsewhere in the suite.

Three files (`allianceAppAccess`, `corporationAppAccess`, `zustandSelectorStability`) were resolving `expect` from Cypress's chai globals rather than Jest, which is why `toEqual` and `toHaveLength` appeared not to exist; they now import `expect` from `@jest/globals` like the rest of the suite.

`activeWarsData` was annotating a `.map` callback with a narrower type than the array's element, which erased the enriched war fields it then asserted on; it now looks wars up through a helper that fails loudly on a missing id instead of indexing into a widened record.
