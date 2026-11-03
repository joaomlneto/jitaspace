# @jitaspace/ship-tree

JitaSpace's adapter for [`@eve-online-tools/eve-ship-tree`](https://github.com/eve-online-tools/node-packages/tree/main/packages/eve-ship-tree), the React components that draw EVE's in-game ship tree. Private to this monorepo; it powers the `/ship-tree` page in `apps/web`.

The web app imports this package, never the library directly.

## What it adds

| Export                                       | What                                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ShipTreeView`                               | One component: faction, optional skills, optional Omega. Loads the data once, sizes itself, hides the library's decorative footer |
| `ShipTreeFactionSelector`                    | The library's faction picker (a grid of logos), listing `SHIP_TREE_FACTIONS` in their alphabetical order                          |
| `SHIP_TREE_FACTIONS` and lookups             | The 17 factions with URL-safe slugs, for pickers and `?faction=`                                                                  |
| `getSkillInTraining`                         | The skill in training, from ESI's skill queue and skills, for `ShipTreeView`'s `training`                                         |
| `SHIP_TREE_DATA_*`, `isShipTreeDataFileName` | The data tables the library fetches, and where we serve them                                                                      |
| `@jitaspace/ship-tree/server`                | `readShipTreeDataFile`: reads a table out of the installed library (Node only)                                                    |
| `@jitaspace/ship-tree/postcss`               | PostCSS plugin that makes the library's stylesheet importable (see below)                                                         |

```tsx
import { ShipTreeView } from "@jitaspace/ship-tree";

<ShipTreeView faction={500001} skills={esiSkills} isOmega={false} h={600} />;
```

`skills` takes the array ESI returns from `/characters/{id}/skills/` as it is.

`summaryFaction` pins the game's faction summary (logo, name, strengths as icons, a one-line description) to the tree's top-left corner, outside its pan and zoom; pass the hovered faction to preview it. It has to render inside the tree's `DataProvider` to get its description and icons, which is why it is a prop rather than a separate component. `cornerControls` goes in the same corner, above the summary: the web app puts `ShipTreeFactionSelector` there, as the game does. The corner is hidden on phones, where it would cover the tree, so a page has to offer those controls itself there.

Rendering options pass straight through to the library, which keeps its defaults for any left out: `locale` (number format in tooltips; the web app passes the Settings language), `goldenCapsule`, `strictMode` (hide the skill bars of locked groups), `panZoom` (`false`, or which gestures), `backgroundColor`, and `groupTooltip`/`shipTooltip` (`false` turns them off). The web app exposes all of them under Settings → Experimental → Ship Tree debug mode.

`preloadShipTreeSprites()` starts fetching the tree's status sprites before it mounts; the faction and race pages call it when their Ship Tree tab is hovered or focused.

The library's tooltips are on by default. Two optional props feed them:

- `training` (`{ skillId, level }`) highlights the skill in training in group tooltips. `getSkillInTraining(queue, skills)` derives it from ESI's `/characters/{id}/skillqueue/` and `/skills/`, skipping the finished entries ESI keeps at the head of the queue until the game client syncs.
- `prices` (`{ [typeId]: isk }` or a lookup) adds an estimated price to ship tooltips. The SDE has no prices; the web app passes ESI's market average from `/markets/prices/`.

## Things to know

**Data.** The library keeps no data in its JavaScript: it fetches its `<table>.jsonl` files in the browser. They ship inside the npm package, and `apps/web/app/api/ship-tree-data/[file]/route.ts` serves them, prerendered at build from `node_modules`. Nothing is copied into the repository or `public/`. The tables are a pinned snapshot of the SDE, not our database, so new game data arrives with a library upgrade.

**Locating the files** uses `module.findPackageJSON` and not `require.resolve`: Turbopack expands a templated `require.resolve` into a glob over every file in `data/generated` and fails the build trying to bundle each `.jsonl` as a module.

**The stylesheet** (`styles.css`) contains four empty `url("")` values that Turbopack refuses to resolve (`Can't resolve ''`). `postcss.cjs` drops them, for that file only, and `apps/web/postcss.config.cjs` loads it. They already rendered as nothing, so no visible change.

**The footer is decorative.** `Grid` defaults to an in-game-style client version (`V1.569.496`), "Military and industrial vessels", and "Courtesy of Kaalakiota Corporation". None of it means anything, and the version could be mistaken for the version of our data, so `ShipTreeView` shows none of that.

## Upgrading the library

`data.ts` and `factions.ts` are typed against the library's exported `DataTableName` and `FactionIdentifier`, so adding or dropping a table or faction fails `pnpm type-check` here. The tests also check our table list against what the library's loader actually requests, and our faction list against its data. Then check the page in a browser: the library's `styles.css` is the part most likely to need attention (does it still ship empty `url("")`s? Is `postcss.cjs` still needed?).

## Tests

```bash
pnpm test
```

They run against the real library and its real data. `tests/helpers.ts` provides a `fetch` that serves the tables the way the web route does.
