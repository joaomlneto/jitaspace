---
"@jitaspace/background-jobs": patch
---

Stopped the zKillboard killmail ingest wedging its cursor, and fixed the victim corporation ids the EVE Ref backfill was collecting.

`scrape-zkillboard-recent-kills` only advanced its R2Z2 cursor after a successful insert, and runs with `retries: 0`. A batch that could never be inserted — most likely a killmail naming a type the SDE had not delivered yet, since Type, SolarSystem and Moon are never created on demand — therefore blocked the feed permanently: every later run re-fetched the same sequences and failed identically. Four changes:

- References the database cannot satisfy are now resolved before the insert. A killmail missing a *required* one (solar system, victim ship, item type) is dropped and logged; missing *optional* ones (moon, attacker ship, attacker weapon) are nulled instead of discarding the kill.
- The four `createMany` calls run in one transaction. A failure part-way through used to leave `Killmail` rows committed with no victim, attackers or items, and `skipDuplicates` then treated those orphans as complete.
- A batch that still fails is retried on the next run and skipped after three attempts, so a transient database error is retried but an unprocessable batch cannot block the cursor.
- A single missing sequence is stepped over rather than ending the run. Previously the first hole stopped collection, and the following run fast-forwarded the cursor to the head of the feed — discarding every killmail between the hole and the head. Fast-forwarding is now reserved for an unbroken run of 25 misses, which is what an expired feed actually looks like.

Skipped ranges — expired or quarantined — are recorded to a capped Redis list so they can be found and replayed rather than vanishing silently.

Separately, `backfill-everef-killmails` built its set of corporation ids to pre-create from each victim's `alliance_id` instead of `corporation_id`, so victim corporations were never resolved and alliance ids were fed to the corporation lookup.
