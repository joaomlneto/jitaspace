import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import type { EsiSearchCategory } from "@jitaspace/hooks";

import { EveEntityAnchor } from "~/components/Anchor/EveEntityAnchor";
import { CATEGORY_ROUTE_PREFIX } from "~/components/Spotlight/useSearchActions";

// Echo the category hint back, so EveEntityAnchor takes the branch of its href
// switch for exactly the category under test.
jest.mock("@jitaspace/hooks", () => ({
  useEsiName: (_id?: string | number, categoryHint?: string) => ({
    name: "Resolved Name",
    category: categoryHint,
    loading: false,
  }),
}));

// Every category ESI search can return. A Record (rather than an array) makes
// type-check fail when ESI adds one, so the new category is checked here too.
const ESI_SEARCH_CATEGORIES: Record<EsiSearchCategory, true> = {
  agent: true,
  alliance: true,
  character: true,
  constellation: true,
  corporation: true,
  faction: true,
  inventory_type: true,
  region: true,
  solar_system: true,
  station: true,
  structure: true,
};

const ENTITY_ID = 13;

function entityAnchorHref(category: EsiSearchCategory): string | undefined {
  const { unmount } = render(
    <MantineProvider>
      <EveEntityAnchor entityId={ENTITY_ID} category={category}>
        Entity
      </EveEntityAnchor>
    </MantineProvider>,
  );
  const href =
    screen.getByText("Entity").closest("a")?.getAttribute("href") ?? undefined;
  unmount();
  return href;
}

// The Spotlight/search route table and EveEntityAnchor's href switch each map
// ESI categories to paths. They drifted once: the table had no constellation or
// region entry, so those search results did nothing when clicked, while the
// same entities linked fine everywhere else.
describe("CATEGORY_ROUTE_PREFIX matches EveEntityAnchor", () => {
  it.each(Object.keys(ESI_SEARCH_CATEGORIES) as EsiSearchCategory[])(
    "routes %s to the same path",
    (category) => {
      const prefix = CATEGORY_ROUTE_PREFIX[category];
      expect(prefix && `${prefix}${ENTITY_ID}`).toBe(
        entityAnchorHref(category),
      );
    },
  );
});
