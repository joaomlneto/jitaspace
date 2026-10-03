import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { NuqsAdapter } from "nuqs/adapters/react";
import { renderToString } from "react-dom/server";

import type { WarRoomWar } from "~/components/Wars/WarRoom";

// /active-wars is prerendered whole (ISR) under `cacheComponents`. Two things
// kept the war list, the page's main content, out of its cached HTML:
//  - Reading the URL through the app-wide Next nuqs adapter
//    (`useSearchParams()`). WarRoom wraps the list in nuqs's React adapter
//    instead, which renders the default view on the server.
//  - Mantine's SegmentedControl, which calls Math.random() while rendering
//    (`useState(randomId())`). That makes its Suspense boundary dynamic; on
//    this static route the whole page then rendered only in the browser.

const passThroughProxy = () => {
  const React = require("react");
  const passThrough = ({ children }: { children?: unknown }) =>
    children == null
      ? null
      : React.createElement(React.Fragment, null, children);
  return new Proxy({}, { get: () => passThrough });
};
jest.mock("@jitaspace/ui", () => passThroughProxy());
jest.mock("@jitaspace/eve-components", () => passThroughProxy());

function war(warId: number, iskDestroyed: number): WarRoomWar {
  const iso = new Date("2026-06-01T00:00:00Z").toISOString();
  return {
    warId,
    aggressorCorporationId: 100 + warId,
    defenderCorporationId: 200 + warId,
    aggressorIskDestroyed: iskDestroyed,
    aggressorShipsKilled: 1,
    defenderIskDestroyed: 0,
    defenderShipsKilled: 0,
    allianceAllies: [],
    corporationAllies: [],
    declaredDate: iso,
    startedDate: iso,
    finishedDate: undefined,
    retractedDate: undefined,
    isMutual: false,
    isOpenForAllies: false,
    updatedAt: iso,
    status: "active",
    totalIskDestroyed: iskDestroyed,
    totalShipsKilled: 1,
    ageDays: 3,
    aggressorIskShare: 1,
  };
}

describe("WarList server render", () => {
  it("renders the default list and its controls in the React adapter", () => {
    const { WarList } = require("~/components/Wars/WarRoom/WarList");
    const html = renderToString(
      <MantineProvider>
        <NuqsAdapter>
          <WarList wars={[war(1, 5e9), war(2, 1e9)]} />
        </NuqsAdapter>
      </MantineProvider>,
    );

    // The controls, in their default state.
    expect(html).toContain('aria-label="Sort wars"');
    expect(html).toContain("In combat");
    // The rows themselves: both wars, in the default rows view.
    // (React separates adjacent text nodes with a comment.)
    expect(html).toMatch(/>2(<!-- -->)? shown</);
    expect(html).not.toContain("No wars match");
  });

  it("draws no control with Math.random()", () => {
    // Under cacheComponents that would make the boundary dynamic and drop the
    // static page out of the cached HTML (see above). Mantine's
    // SegmentedControl did; the list's own Segmented must not.
    const random = jest.spyOn(Math, "random");
    const { WarList } = require("~/components/Wars/WarRoom/WarList");
    renderToString(
      <MantineProvider>
        <NuqsAdapter>
          <WarList wars={[war(1, 5e9)]} />
        </NuqsAdapter>
      </MantineProvider>,
    );
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
  });
});
