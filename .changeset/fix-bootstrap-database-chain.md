---
"@jitaspace/background-jobs": patch
---

Fixed three defects that stopped `bootstrap-database` completing against an
empty database. Bootstrap invokes children with `ctx.invoke`, has `retries: 0`, and
deliberately propagates child failures, so either one aborted the whole chain.

- `ingest-sde-stargates` failed with `deadlock detected` (PostgreSQL 40P01)
  whenever there was a real backlog to write. Stargates are mutually-referencing
  pairs — A's destination is B while B's is A — and PostgreSQL takes a
  `FOR KEY SHARE` lock on the FK-referenced row on top of the row being written,
  so two concurrent single-row updates on a pair each hold what the other needs.
  Pair members are adjacent in SDE order, so `pLimit(20)` hit this reliably on a
  cold table. The destination backfill is now chunked bulk `UPDATE`s; one
  statement is one transaction and cannot deadlock against itself. It is also
  roughly 4x faster (3.8s vs 16s), since two statements replace 14k round-trips.
- `scrape-sde-agents` failed with an `Agent_stationId_fkey` violation (P2003) on
  a cold database. `Agent.stationId` is a non-nullable FK and agents sit in NPC
  stations, but bootstrap does not invoke `scrape-esi-stations`, so until
  `ingest-sde-stations` runs the table holds only the handful of corporation
  home stations. The job is now sequenced into the FK-ordered SDE ingest loop,
  after `ingest-sde-stations` and before `ingest-sde-agents-in-space` (which FKs
  `Agent`) — still after every ESI scraper, since the loop runs after them.

- `scrape-sde-agents` aborted the run on the first NPC character that is not an
  agent. `npcCharacters.yaml` covers every NPC character and omits the whole
  `agent` block on non-agents, but `optionalNumber(record.agent?.agentTypeID)`
  collapses that missing container to `null`, which the required-field guard
  reads as corrupt data and throws on. A real SDE holds hundreds of these — an
  end-to-end run saw 11,325 NPC characters yield 10,897 agents. Those records
  are now filtered out before the guard; the soft-delete scope stays the full id
  list, so a character that loses its agent block still has its row marked
  deleted. A record whose `agent` block exists but lacks the required fields
  still throws, as before.

The ordering is guarded by a test rather than a comment: it matches a literal id
inside the loop, which the registry's generic `ctx.invoke` scan cannot see, so
renaming or dropping that id would otherwise make bootstrap skip the agent
scrape silently.
