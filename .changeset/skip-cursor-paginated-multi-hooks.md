---
"@jitaspace/hooks": patch
---

Three generated multi-subject hooks were returning only the first page of their collection: `useMultipleCharacterCalendar`, `useMultipleCharacterMail` and `useMultipleCharacterWalletTransactions`. ESI pages those by `from_event`, `last_mail_id` and `from_id` respectively, none of which the OpenAPI spec declares as pagination — `x-pagination: cursor` marks only five unrelated operations — so the generator treated them as ordinary single-request lists and emitted hooks whose names promised every subject's whole collection.

The generator now works from an allowlist: an endpoint is generated only when every query parameter is known not to affect completeness (`page`, which is walked in full, plus the `include_completed` and `labels` filters). Anything unrecognised is assumed to be a cursor and the endpoint is skipped, so a newly added parameter removes a hook — noticeable — instead of silently truncating one.

73 hooks now ship, down from 76. The two industry-jobs hooks are unaffected: `include_completed` is a filter whose default already matches the single-subject hooks.
