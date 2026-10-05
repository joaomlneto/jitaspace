"use client";

import { Switch } from "@mantine/core";
import { parseAsBoolean, useQueryState } from "nuqs";

import type { FactionIdentifier } from "@jitaspace/ship-tree";

import { ShipTreePanel } from "~/components/ShipTree";

/**
 * The faction page's Ship Tree tab. Its own module so the page can load it
 * lazily: the tree library and its stylesheet only reach the browser when the
 * tab is opened, and never the page's cached HTML.
 */
export default function FactionShipTree({
  faction,
}: Readonly<{ faction: FactionIdentifier }>) {
  // In the URL, as on /ship-tree, so a link keeps the clone state.
  const [isOmega, setIsOmega] = useQueryState(
    "omega",
    parseAsBoolean.withDefault(false),
  );

  return (
    <ShipTreePanel
      faction={faction}
      isOmega={isOmega}
      controls={
        <Switch
          label="Omega clone"
          checked={isOmega}
          onChange={(event) => {
            void setIsOmega(event.currentTarget.checked);
          }}
        />
      }
      // On a phone the tree fits to the width and is only ~200px tall, so a
      // full-height viewport would be mostly empty; leave room to pan.
      h={{ base: 360, sm: "70vh" }}
      mih={{ base: 360, sm: 480 }}
    />
  );
}
