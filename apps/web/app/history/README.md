# Change History

Browse how EVE Online static data has changed across client builds over time —
**file-backed, no database.**

It tracks several entity kinds, each browseable on its own axis:

- **types** — item types, plus everything keyed by typeID that decorates them
  (dogma, materials, mutaplasmid attributes, required skills, skin licenses).
- **skins** — ship SKINs (paint schemes), keyed by their own `skinID`.
- **skin materials** — colour palettes shared by SKINs, keyed by `skinMaterialID`.

Skins and skin materials have ids of their own that collide with real typeIDs,
so they live in separate `entityType` dimensions rather than the per-type tree.

## How it works

The history is an append-only change log, decoded from the EVE resource server
and materialised as static JSON under [`apps/web/public/history/`](../../public/history),
fetched by the client like any other static asset. It is laid out along the two
axes it is queried by — never both at once — so each question is a single file
fetch, no scan, no join:

| Question | File | Route |
| --- | --- | --- |
| What did this build change? | `history/build/{build}.json` | `/history/build/[build]` |
| How has this entity changed? | `history/{entityType}/{id}.json` | `/history/{entityType}/[id]` |
| What builds & entities exist? | `history/index.json` | `/history` |

`{entityType}` is `type`, `skin`, or `skinMaterial`; e.g. `history/type/587.json`,
`history/skin/12747.json`. The index lists `entityTypes` and `entityIdsByType`.

The same change events are written into both the by-build and by-entity files.
Each carries an `entityType` (absent ⇒ `type`) and a `collection` (the source
dataset — `types`, `typeDogma`, `skins`, …; absent ⇒ `types`). Denormalising
like this is safe because the data is immutable and append-only — there is no
update to keep consistent.

## Change payload

Each event is a versioned discriminated union (`added` / `modified` / `removed`).
Per-field deltas use `{ from?, to? }` with **optional keys**, so a value change
(both present) is distinguishable from a field appearing (`to` only) or
disappearing (`from` only) — an ambiguity a `[old, new]` tuple can't express.
The reader schema lives in [`apps/web/lib/history.ts`](../../lib/history.ts) and
mirrors the generator's schema in `apps/cli/utils/history.ts`.

## Regenerating

The data is produced by the `build-history` CLI command, which decodes a
sequence of builds from `resources.eveonline.com` — FSD binaries via
`@jitaspace/pyd-loader`, and SQLite `.static` caches (skins, skin materials,
skin licenses) via `sql.js` — diffs adjacent ones, and writes this tree:

```bash
# from apps/cli — a recent spread (default), change-only
pnpm exec build-history --output-dir ../web/public/history

# a custom / longer-range set of builds (must be ≥ CDN_CUTOFF_BUILD)
pnpm exec build-history --builds 3103065,3300615,3336162,3376632 \
  --output-dir ../web/public/history

# also record a full starting snapshot at the first build
pnpm exec build-history --baseline --output-dir ../web/public/history

# EVERY CDN-available build (~491 for Tranquility, back to 2023). Long-running
# (hours of decode) but resumable: decoded payloads are cached by md5, so a
# re-run skips everything already done. Bump the heap for the full sweep.
NODE_OPTIONS=--max-old-space-size=4096 \
  pnpm exec build-history --all --output-dir ../web/public/history
```

By default only real inter-build changes are emitted (the first build is a
silent reference point), so the committed tree stays small. The timeline's depth
is bounded by how far back the CDN retains builds, not by the tooling.

`--all` sweeps every build `KNOWN_BUILDS[server]` lists at or above
`CDN_CUTOFF_BUILD`. It streams (only the previous build's snapshot is held in
memory) and caches each decoded payload by md5 under a temp dir (`--cache-dir`
to relocate, `--no-cache` to disable), so the multi-hour job is interruptible
and resumable. Most builds don't touch a given collection, so adjacent-md5
reuse skips the vast majority of decodes. Other flags: `--server`, `--from`,
`--to`, `--limit` (keep only the most recent N — handy for partial runs).
