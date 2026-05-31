import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// The Breadcrumbs components delegate to ../Anchor and ../Text. The id-based
// names/anchors (Category by id, Region, Constellation, SolarSystem, Type)
// ultimately resolve through EveEntityName / EveEntityAnchor, which call
// useEsiName from "@jitaspace/hooks". We replace the whole "@jitaspace/hooks"
// module with a self-contained stub so none of its heavy, ESM-only transitive
// dependencies (e.g. @tanstack/db) ever load. The factory must NOT close over
// any outer variable: with @swc/jest, a factory that references locals is not
// hoisted above the real import, which then crashes on untransformed ESM. So
// the stub derives a deterministic, assertable name from the category argument
// it receives. The name-prop based breadcrumb parts (GroupName/CategoryName/
// MarketGroupName with `name`) render their text directly without any hook.
jest.mock("@jitaspace/hooks", () => ({
  useEsiName: (_entityId?: string | number, category?: string) => ({
    name: `Resolved ${category ?? "entity"}`,
    category,
    loading: false,
  }),
}));

// next/link is rendered (via Mantine's `Anchor component={Link}`) by several
// breadcrumbs. Replace it with a plain anchor so jsdom can render it.
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href?: string | object;
    children?: ReactNode;
  }) => <a href={typeof href === "string" ? href : "#"}>{children}</a>,
}));

import { CategoryBreadcrumbs } from "../../Breadcrumbs/CategoryBreadcrumbs";
import { GroupBreadcrumbs } from "../../Breadcrumbs/GroupBreadcrumbs";
import { SolarSystemBreadcrumbs } from "../../Breadcrumbs/SolarSystemBreadcrumbs";
import { TypeInventoryBreadcrumbs } from "../../Breadcrumbs/TypeInventoryBreadcrumbs";
import { TypeMarketBreadcrumbs } from "../../Breadcrumbs/TypeMarketBreadcrumbs";

const renderWithMantine = (ui: ReactNode) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("CategoryBreadcrumbs", () => {
  it("renders the Inventory root link and a category anchor for the given id", () => {
    const { container } = renderWithMantine(<CategoryBreadcrumbs categoryId={6} />);
    // Static root link.
    const inventory = screen.getByText("Inventory");
    expect(inventory).toBeInTheDocument();
    expect(inventory.closest("a")).toHaveAttribute("href", "/categories");
    // CategoryName here only receives `categoryId` (not a `name`), so it shows
    // a skeleton placeholder wrapped by a CategoryAnchor -> /category/<id>.
    const categoryLink = container.querySelector('a[href="/category/6"]');
    expect(categoryLink).toBeTruthy();
    expect(
      categoryLink?.querySelector(".mantine-Skeleton-root"),
    ).toBeTruthy();
  });

  it("renders without a categoryId (anchor falls back to children only)", () => {
    const { container } = renderWithMantine(<CategoryBreadcrumbs />);
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(container.querySelector(".mantine-Breadcrumbs-root")).toBeTruthy();
    // No categoryId => CategoryAnchor returns its children directly (no link).
    expect(container.querySelector('a[href^="/category/"]')).toBeFalsy();
  });
});

describe("GroupBreadcrumbs", () => {
  it("renders Inventory root plus category and group names from props", () => {
    renderWithMantine(
      <GroupBreadcrumbs
        categoryId={6}
        categoryName="Ship"
        groupId={25}
        groupName="Frigate"
      />,
    );
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(screen.getByText("Ship")).toBeInTheDocument();
    expect(screen.getByText("Frigate")).toBeInTheDocument();
    // Category and group anchors point at their detail pages.
    expect(screen.getByText("Ship").closest("a")).toHaveAttribute(
      "href",
      "/category/6",
    );
    expect(screen.getByText("Frigate").closest("a")).toHaveAttribute(
      "href",
      "/group/25",
    );
  });

  it("renders skeleton placeholders when category/group names are absent", () => {
    const { container } = renderWithMantine(
      <GroupBreadcrumbs categoryId={6} groupId={25} />,
    );
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(container.querySelectorAll(".mantine-Skeleton-root").length).toBeGreaterThanOrEqual(2);
  });
});

describe("SolarSystemBreadcrumbs", () => {
  it("renders region, constellation and solar system resolved names", () => {
    renderWithMantine(
      <SolarSystemBreadcrumbs
        regionId={10000002}
        constellationId={20000020}
        solarSystemId={30000142}
      />,
    );
    expect(screen.getByText("Resolved region")).toBeInTheDocument();
    expect(screen.getByText("Resolved constellation")).toBeInTheDocument();
    expect(screen.getByText("Resolved solar_system")).toBeInTheDocument();
  });

  it("hides the solar system segment when hideSolarSystem is set", () => {
    renderWithMantine(
      <SolarSystemBreadcrumbs
        regionId={10000002}
        constellationId={20000020}
        solarSystemId={30000142}
        hideSolarSystem
      />,
    );
    expect(screen.getByText("Resolved region")).toBeInTheDocument();
    expect(screen.getByText("Resolved constellation")).toBeInTheDocument();
    expect(screen.queryByText("Resolved solar_system")).not.toBeInTheDocument();
  });

  it("forwards textProps to the underlying name components", () => {
    renderWithMantine(
      <SolarSystemBreadcrumbs
        regionId={10000002}
        constellationId={20000020}
        solarSystemId={30000142}
        textProps={{ c: "red" }}
      />,
    );
    // Still renders; textProps are spread onto the Text components.
    expect(screen.getByText("Resolved region")).toBeInTheDocument();
  });
});

describe("TypeInventoryBreadcrumbs", () => {
  it("renders category/group names and omits the type by default", () => {
    renderWithMantine(
      <TypeInventoryBreadcrumbs
        categoryId={6}
        categoryName="Ship"
        groupId={25}
        groupName="Frigate"
        typeId={587}
      />,
    );
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(screen.getByText("Ship")).toBeInTheDocument();
    expect(screen.getByText("Frigate")).toBeInTheDocument();
    // showType defaults to false, so the resolved type name is absent.
    expect(screen.queryByText("Resolved inventory_type")).not.toBeInTheDocument();
  });

  it("renders the resolved type segment when showType is true", () => {
    renderWithMantine(
      <TypeInventoryBreadcrumbs
        categoryId={6}
        categoryName="Ship"
        groupId={25}
        groupName="Frigate"
        typeId={587}
        showType
      />,
    );
    expect(screen.getByText("Resolved inventory_type")).toBeInTheDocument();
  });
});

describe("TypeMarketBreadcrumbs", () => {
  it("renders the Market root and each provided market group name", () => {
    renderWithMantine(
      <TypeMarketBreadcrumbs
        typeId={587}
        marketGroups={[
          { market_group_id: 4, name: "Ships" },
          { market_group_id: 5, name: "Standard Frigates" },
        ]}
      />,
    );
    const market = screen.getByText("Market");
    expect(market).toBeInTheDocument();
    expect(market.closest("a")).toHaveAttribute("href", "/market");
    expect(screen.getByText("Ships")).toBeInTheDocument();
    expect(screen.getByText("Standard Frigates")).toBeInTheDocument();
    expect(screen.getByText("Ships").closest("a")).toHaveAttribute(
      "href",
      "/market-group/4",
    );
    // showType defaults to false.
    expect(screen.queryByText("Resolved inventory_type")).not.toBeInTheDocument();
  });

  it("renders the resolved type segment when showType is true", () => {
    renderWithMantine(
      <TypeMarketBreadcrumbs
        typeId={587}
        marketGroups={[{ market_group_id: 4, name: "Ships" }]}
        showType
      />,
    );
    expect(screen.getByText("Resolved inventory_type")).toBeInTheDocument();
  });

  it("renders with no market groups (defaults to an empty list)", () => {
    renderWithMantine(<TypeMarketBreadcrumbs typeId={587} />);
    expect(screen.getByText("Market")).toBeInTheDocument();
  });
});
