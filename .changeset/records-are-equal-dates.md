---
"@jitaspace/background-jobs": patch
---

Background syncs now notice when a stored date changes. `recordsAreEqual`
compared a `Date` by walking its own enumerable keys, and a `Date` has none, so
any two dates compared equal and `updateTable` never updated a row whose only
change was a date moving from one instant to another (changes to or from
`null` were already detected). Dates now compare by the instant they hold. The
first sync after this ships will update, once, any rows whose dates had
drifted — most plausibly war finish dates.
