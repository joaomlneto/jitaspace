"use client";

import "@eve-online-tools/eve-ship-tree/styles.css";

import type {
  FactionIdentifier,
  ShipPrices,
  SkillsInput,
  SkillTraining,
} from "@eve-online-tools/eve-ship-tree";
import type { BoxProps } from "@mantine/core";
import {
  DataProvider,
  Grid,
  ShipTree,
  SkillsProvider,
  TreeDisplay,
} from "@eve-online-tools/eve-ship-tree";
import { Box } from "@mantine/core";

import { SHIP_TREE_DATA_BASE_URL } from "./data";
import { getShipTreeFaction } from "./factions";

const NO_SKILLS: SkillsInput = {};

export interface ShipTreeViewProps extends Omit<BoxProps, "children"> {
  /** Whose tree to draw. See `SHIP_TREE_FACTIONS` for the ids on offer. */
  faction: FactionIdentifier;
  /**
   * The trained skills to light the tree up with: the array ESI returns from
   * `/characters/{id}/skills/`, or a `{ [skillId]: level }` map. Omit it and
   * every ship reads as untrained.
   */
  skills?: SkillsInput;
  /**
   * The skill in training and the level it trains to. Group tooltips highlight
   * it. See `getSkillInTraining` for deriving it from ESI's skill queue.
   */
  training?: SkillTraining;
  /**
   * Ship prices in ISK, as a `{ [typeId]: isk }` map or a lookup. Ship tooltips
   * show an estimated price for every ship this prices; the rest show none.
   */
  prices?: ShipPrices;
  /**
   * Draw the tree for an Omega clone. Off, it marks where Omega-only ships
   * begin; on, it plays those markers down.
   */
  isOmega?: boolean;
  /**
   * Where the data tables are fetched from, as `<dataBaseUrl>/<table>.jsonl`.
   * Defaults to the path the web app serves them on.
   */
  dataBaseUrl?: string;
  /** `fetch` used to load the data tables. Mostly for tests. */
  fetch?: typeof fetch;
  /** Replaces the frame's footer line, which describes the selected faction. */
  disclaimer?: string | null;
}

/**
 * The in-game ship tree for one faction, drawn by
 * `@eve-online-tools/eve-ship-tree` and fitted to JitaSpace.
 *
 * What this adds over using the library directly:
 *
 * - **Data.** The library fetches its tables at runtime; they are pointed at
 *   the app's own `/api/ship-tree-data` route by default, and loaded once per
 *   mount rather than again on every faction switch.
 * - **Sizing.** The library fills its parent's height and draws nothing useful
 *   without one, so this supplies a default viewport (override with `h`/`mih`).
 * - **A truthful frame.** The library's footer defaults are in-game flavour
 *   text, including an invented client version (`V1.569.496`) that would read
 *   as the version of our data. None of it is shown here.
 */
export function ShipTreeView({
  faction,
  skills = NO_SKILLS,
  training,
  prices,
  isOmega = false,
  dataBaseUrl = SHIP_TREE_DATA_BASE_URL,
  fetch,
  disclaimer = null,
  h = "75vh",
  mih = 420,
  ...boxProps
}: Readonly<ShipTreeViewProps>) {
  const { name } = getShipTreeFaction(faction);

  return (
    <Box h={h} mih={mih} {...boxProps}>
      <SkillsProvider skills={skills} training={training}>
        <DataProvider baseUrl={dataBaseUrl} fetch={fetch}>
          {/* Keyed so each faction gets a fresh pan/zoom fit; the data above
              stays loaded. */}
          <ShipTree
            key={faction}
            faction={faction}
            isOmega={isOmega}
            prices={prices}
          >
            <Grid
              topLabel={name}
              versionLabel=""
              bottomLabel={["Showing", `${name} ships`]}
              disclaimer={disclaimer}
            >
              <TreeDisplay />
            </Grid>
          </ShipTree>
        </DataProvider>
      </SkillsProvider>
    </Box>
  );
}
