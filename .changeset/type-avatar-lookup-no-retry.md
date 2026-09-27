---
"@jitaspace/eve-components": patch
---

Stop the `TypeAvatar` variation lookup retrying a permanent failure forever.

Moving the lookup into this package added a `response.ok` check so a non-2xx is no longer parsed as if it were a variation list. That check is right, but it changed the failure semantics: the previous fetcher never threw, so SWR cached the (nonsense) result and issued exactly one request. Throwing hands control to SWR's error-retry path, and SWR retries errors indefinitely by default — `errorRetryCount` is absent from its defaults, and `useSWRImmutable` only disables stale/focus/reconnect revalidation, not error retry. Every mounted avatar holding an unknown type id would have scheduled an endless background retry chain.

The lookup now passes `shouldRetryOnError: false`, since a non-2xx from the variations endpoint is a permanent answer about that type id. Rendered output is unchanged either way.

The fetcher had no test coverage — `swr/immutable` is mocked wholesale in this package's suite, so it was never executed. It now has tests for both the success and non-2xx paths, plus tests pinning the retry config and the pinned-variation short-circuit.
