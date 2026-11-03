import { NuqsAdapter } from "nuqs/adapters/react";

import { pageMetadata } from "~/lib/metadata";
import { readPiCatalog } from "./catalog";
import PlanetaryInteractionPageClient from "./page.client";

export const metadata = pageMetadata({
  title: "Planetary Interaction",
  description:
    "Track your EVE Online planetary colonies across all your characters: extractor programs, factories, storage and daily production.",
  path: "/planetary-interaction",
  badge: "Planetary Interaction",
});

export default async function Page() {
  // The schematics and type names are SDE data, prerendered into the page;
  // the colonies are the player's and load in the browser.
  const catalog = await readPiCatalog();
  // The React adapter rather than the app-wide Next one, so the filters do
  // not drop the page out of its static HTML (see apps/web/CLAUDE.md, nuqs).
  return (
    <NuqsAdapter>
      <PlanetaryInteractionPageClient catalog={catalog} />
    </NuqsAdapter>
  );
}
