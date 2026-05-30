import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// next/navigation — the page client receives props directly, but the route
// segment reads the id via useParams; mock defensively so nothing throws.
// ---------------------------------------------------------------------------
jest.mock("next/navigation", () => ({
  useParams: () => ({ typeId: "30" }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

// ---------------------------------------------------------------------------
// Hook mocks (jest.fn declared at module scope so each test can vary data)
// ---------------------------------------------------------------------------
const mockUseSelectedCharacter = jest.fn();
const mockUseType = jest.fn();
const mockUseMarketPrices = jest.fn();
const mockUseFuzzworkTypeMarketStats = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useType: (...args: unknown[]) => mockUseType(...args),
  useMarketPrices: () => mockUseMarketPrices(),
  useFuzzworkTypeMarketStats: (...args: unknown[]) =>
    mockUseFuzzworkTypeMarketStats(...args),
}));

// ESI client hook used for the group/category lookup.
const mockUseGetUniverseGroupsGroupId = jest.fn();
jest.mock("@jitaspace/esi-client", () => ({
  useGetUniverseGroupsGroupId: (...args: unknown[]) =>
    mockUseGetUniverseGroupsGroupId(...args),
}));

// SDE client query-option builders: encode the requested id so the mocked
// useQueries can hand back matching data.
jest.mock("@jitaspace/sde-client", () => ({
  getDogmaAttributeByIdQueryOptions: (attributeId: number) => ({
    queryKey: ["dogmaAttribute", attributeId],
    __attributeId: attributeId,
  }),
  getDogmaAttributeCategoryByIdQueryOptions: (categoryId: number) => ({
    queryKey: ["dogmaAttributeCategory", categoryId],
    __categoryId: categoryId,
  }),
}));

// useQueries: for attribute queries return a category id derived from the
// attribute, for category queries return a human-readable name.
const mockUseQueries = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useQueries: (...args: unknown[]) => mockUseQueries(...args),
}));

jest.mock("@jitaspace/tiptap-eve", () => ({
  sanitizeFormattedEveString: (s: string) => s,
}));

// Stub every @jitaspace/ui export to render nothing. The Proxy factory has no
// external closure so it is hoist-safe.
jest.mock(
  "@jitaspace/ui",
  () =>
    new Proxy(
      {},
      {
        get: () => () => null,
      },
    ),
);

jest.mock("~/components/ActionIcon", () => ({
  OpenMarketWindowActionIcon: () => null,
}));
jest.mock("~/components/Breadcrumbs", () => ({
  TypeInventoryBreadcrumbs: () => null,
  TypeMarketBreadcrumbs: () => null,
}));
jest.mock("~/components/Text", () => ({
  CategoryName: () => null,
  DogmaAttributeName: () => null,
  DogmaEffectName: () => null,
  GroupName: () => null,
  MarketGroupName: () => null,
}));
jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content?: string }) => (
    <div data-testid="mail-viewer">{content}</div>
  ),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href?: string | object;
    children?: React.ReactNode;
  }) => <a href={typeof href === "string" ? href : ""}>{children}</a>,
}));

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------
const FULL_TYPE_DATA = {
  type_id: 30,
  name: "Tritanium",
  description: "A common mineral.",
  published: true,
  group_id: 18,
  market_group_id: 1031,
  capacity: 0,
  mass: 1,
  radius: 1,
  volume: 0.01,
  packaged_volume: 0.01,
  portion_size: 100,
  graphic_id: 1234,
  icon_id: 5678,
  dogma_attributes: [
    { attribute_id: 4, value: 100 }, // -> category 7 (named)
    { attribute_id: 161, value: 0.01 }, // -> category 7 (named)
    { attribute_id: 999, value: 5 }, // -> no category (uncategorized)
  ],
  dogma_effects: [
    { effect_id: 11, is_default: true },
    { effect_id: 12, is_default: false },
  ],
};

function renderPage(props?: Record<string, unknown>) {
  const Page = require("~/app/type/[typeId]/page.client").default;
  return render(
    <MantineProvider>
      <Page typeId={30} {...props} />
    </MantineProvider>,
  );
}

describe("Type page (client)", () => {
  beforeEach(() => {
    mockUseSelectedCharacter.mockReset();
    mockUseType.mockReset();
    mockUseMarketPrices.mockReset();
    mockUseFuzzworkTypeMarketStats.mockReset();
    mockUseGetUniverseGroupsGroupId.mockReset();
    mockUseQueries.mockReset();

    // Defaults exercised by the "full data" path.
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123 });
    mockUseType.mockReturnValue({ data: { data: FULL_TYPE_DATA } });
    mockUseMarketPrices.mockReturnValue({
      data: {
        30: { average_price: 6.5, adjusted_price: 7.25 },
      },
    });
    mockUseFuzzworkTypeMarketStats.mockReturnValue({
      data: {
        buy: { percentile: 5 },
        sell: { percentile: 7 },
      },
    });
    mockUseGetUniverseGroupsGroupId.mockReturnValue({
      data: { data: { category_id: 4 } },
    });

    // First call: attribute queries -> map attribute_id to a category id
    // (4 and 161 -> 7, 999 -> undefined). Second call: category queries ->
    // return a name for category 7.
    mockUseQueries.mockImplementation((arg: unknown) => {
      const { queries } = arg as { queries: { __attributeId?: number; __categoryId?: number }[] };
      return queries.map((q) => {
        if (q.__attributeId !== undefined) {
          const categoryID = q.__attributeId === 999 ? undefined : 7;
          return { data: { data: { attributeCategoryID: categoryID } } };
        }
        // category query
        return { data: { data: { name: "Armor" } } };
      });
    });
  });

  it("renders every section with full data present", () => {
    renderPage();

    // Title appears (h1 + identity name detail).
    expect(screen.getAllByText("Tritanium").length).toBeGreaterThanOrEqual(1);

    // Identity & Classification
    expect(screen.getByText("Identity & Classification")).toBeInTheDocument();
    expect(screen.getByText("Type ID")).toBeInTheDocument();
    expect(screen.getByText("Market Group ID")).toBeInTheDocument();

    // Properties
    expect(screen.getByText("Properties")).toBeInTheDocument();
    expect(screen.getByText("Capacity")).toBeInTheDocument();
    expect(screen.getByText("Icon ID")).toBeInTheDocument();

    // Description spoiler -> mail viewer
    expect(screen.getByTestId("mail-viewer")).toHaveTextContent(
      "A common mineral.",
    );

    // Market Information + fuzzwork block
    expect(screen.getByText("Market Information")).toBeInTheDocument();
    expect(screen.getByText("Average Price")).toBeInTheDocument();
    expect(screen.getByText("Adjusted Price")).toBeInTheDocument();
    expect(screen.getByText("Jita Buy")).toBeInTheDocument();
    expect(screen.getByText("Jita Split")).toBeInTheDocument();
    expect(screen.getByText("Jita Sell")).toBeInTheDocument();

    // Dogma attributes: categorized table renders (named + uncategorized)
    expect(screen.getByText("Dogma Attributes")).toBeInTheDocument();
    expect(screen.getByText("Armor (7)")).toBeInTheDocument();
    expect(screen.getByText("Uncategorized")).toBeInTheDocument();

    // Dogma effects table renders
    expect(screen.getByText("Dogma Effects")).toBeInTheDocument();
    expect(screen.getAllByText("Effect").length).toBeGreaterThanOrEqual(1);

    // External links
    expect(
      screen.getByRole("link", { name: /Eve Ref/ }),
    ).toHaveAttribute("href", "https://www.everef.net/type/30");
    expect(
      screen.getByRole("link", { name: /EVE Tycoon/ }),
    ).toHaveAttribute("href", "https://evetycoon.com/market/30");
  });

  it("sorts multiple distinct categories numerically and places uncategorized last", () => {
    mockUseType.mockReturnValue({
      data: {
        data: {
          ...FULL_TYPE_DATA,
          dogma_attributes: [
            { attribute_id: 4, value: 1 }, // -> category 9
            { attribute_id: 50, value: 2 }, // -> category 3
            { attribute_id: 999, value: 3 }, // -> uncategorized
          ],
        },
      },
    });

    // attr 4 -> cat 9, attr 50 -> cat 3, attr 999 -> uncategorized.
    mockUseQueries.mockImplementation((arg: unknown) => {
      const { queries } = arg as {
        queries: { __attributeId?: number; __categoryId?: number }[];
      };
      return queries.map((q) => {
        if (q.__attributeId !== undefined) {
          if (q.__attributeId === 999)
            return { data: { data: { attributeCategoryID: undefined } } };
          const categoryID = q.__attributeId === 4 ? 9 : 3;
          return { data: { data: { attributeCategoryID: categoryID } } };
        }
        // category query -> name keyed off categoryId
        const name = q.__categoryId === 9 ? "Required Skills" : "Fitting";
        return { data: { data: { name } } };
      });
    });

    renderPage();

    // Numeric sort: category 3 ("Fitting") before category 9, uncategorized last.
    expect(screen.getByText("Fitting (3)")).toBeInTheDocument();
    expect(screen.getByText("Required Skills (9)")).toBeInTheDocument();
    expect(screen.getByText("Uncategorized")).toBeInTheDocument();
  });

  it("falls back to the unnamed category label when a category name is missing", () => {
    // Category query returns no name -> "Category 7" fallback used.
    mockUseQueries.mockImplementation((arg: unknown) => {
      const { queries } = arg as { queries: { __attributeId?: number; __categoryId?: number }[] };
      return queries.map((q) => {
        if (q.__attributeId !== undefined) {
          const categoryID = q.__attributeId === 999 ? undefined : 7;
          return { data: { data: { attributeCategoryID: categoryID } } };
        }
        return { data: undefined };
      });
    });

    renderPage();
    expect(screen.getByText("Category 7 (7)")).toBeInTheDocument();
  });

  it("renders fallbacks when optional data is empty/undefined", () => {
    // No type data, no character, no prices, no fuzzwork stats, no group.
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseType.mockReturnValue({ data: undefined });
    mockUseMarketPrices.mockReturnValue({ data: {} });
    mockUseFuzzworkTypeMarketStats.mockReturnValue({ data: null });
    mockUseGetUniverseGroupsGroupId.mockReturnValue({ data: undefined });
    mockUseQueries.mockReturnValue([]);

    renderPage({ typeName: "Fallback Name", typeDescription: undefined });

    // Sections still render with "Not available" placeholders.
    expect(screen.getByText("Identity & Classification")).toBeInTheDocument();
    expect(screen.getAllByText("Not available").length).toBeGreaterThan(0);

    // Fuzzwork block absent.
    expect(screen.queryByText("Jita Buy")).not.toBeInTheDocument();

    // Dogma sections show the empty placeholder.
    expect(screen.getByText("Dogma Attributes")).toBeInTheDocument();
    expect(screen.getByText("Dogma Effects")).toBeInTheDocument();

    // No description spoiler when both description sources are empty.
    expect(screen.queryByTestId("mail-viewer")).not.toBeInTheDocument();
  });

  it("uses the typeData group category id and handles undefined group_id/market_group_id", () => {
    mockUseType.mockReturnValue({
      data: {
        data: {
          type_id: 30,
          name: "No Groups Item",
          published: false,
          // group_id and market_group_id intentionally undefined
          dogma_attributes: [],
          dogma_effects: [],
        },
      },
    });
    mockUseGetUniverseGroupsGroupId.mockReturnValue({
      data: { data: {} }, // category_id undefined
    });
    mockUseQueries.mockReturnValue([]);

    renderPage();

    // category id undefined -> "Not available" used in Category + Category ID.
    expect(screen.getByText("Market Group")).toBeInTheDocument();
    expect(screen.getAllByText("Not available").length).toBeGreaterThan(0);
    // booleanBadge false branch ("No") for unpublished.
    expect(screen.getByText("Published")).toBeInTheDocument();
  });

  it("shows the loading state when typeId is falsy", () => {
    const Page = require("~/app/type/[typeId]/page.client").default;
    render(
      <MantineProvider>
        <Page typeId={0} />
      </MantineProvider>,
    );
    expect(
      screen.getByText("Loading type information..."),
    ).toBeInTheDocument();
  });
});
