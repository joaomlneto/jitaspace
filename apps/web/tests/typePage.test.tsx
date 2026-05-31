import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// next/navigation — the page client receives props directly; mock defensively.
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
  getDogmaUnitByIdQueryOptions: (unitId: number) => ({
    queryKey: ["dogmaUnit", unitId],
    __unitId: unitId,
  }),
}));

// useQueries: attribute queries -> a category id, category queries -> a name,
// unit queries -> a display symbol. useQuery: the type image-variations fetch.
const mockUseQueries = jest.fn();
const mockUseQuery = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useQueries: (...args: unknown[]) => mockUseQueries(...args),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
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
    { attribute_id: 999, value: 5 }, // -> no category (other)
  ],
  dogma_effects: [
    { effect_id: 11, is_default: true },
    { effect_id: 12, is_default: false },
  ],
};

interface QueryStub {
  __attributeId?: number;
  __categoryId?: number;
  __unitId?: number;
}

interface TypePageProps {
  typeId?: number;
  typeName?: string;
  typeDescription?: string;
}

// Require the page lazily so the jest.mock(...) factories above are active
// before the module (and its transitively-mocked deps) are evaluated.
function getPage(): React.ComponentType<TypePageProps> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
  return require("~/app/type/[typeId]/page.client").default;
}

function renderPage(props: TypePageProps = {}) {
  const TypePage = getPage();
  return render(
    <MantineProvider>
      <TypePage typeId={30} {...props} />
    </MantineProvider>,
  );
}

function clickTab(name: RegExp) {
  fireEvent.click(screen.getByRole("tab", { name }));
}

describe("Type page (client)", () => {
  beforeEach(() => {
    mockUseSelectedCharacter.mockReset();
    mockUseType.mockReset();
    mockUseMarketPrices.mockReset();
    mockUseFuzzworkTypeMarketStats.mockReset();
    mockUseGetUniverseGroupsGroupId.mockReset();
    mockUseQueries.mockReset();
    mockUseQuery.mockReset();

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

    // The type image-variations query — no variations (falls back to icon).
    mockUseQuery.mockReturnValue({ data: [] });

    // Attribute queries -> a category id (4 and 161 -> 7, 999 -> undefined).
    // Category queries -> a name. Unit queries -> a display symbol.
    mockUseQueries.mockImplementation((arg: unknown) => {
      const { queries } = arg as { queries: QueryStub[] };
      return queries.map((q) => {
        if (q.__attributeId !== undefined) {
          const attributeCategoryID = q.__attributeId === 999 ? undefined : 7;
          return { data: { data: { attributeCategoryID } } };
        }
        if (q.__categoryId !== undefined) {
          return { data: { data: { name: "Armor" } } };
        }
        return { data: { data: { displayName: { en: "" } } } };
      });
    });
  });

  it("renders the hero and overview tab with full data", () => {
    renderPage();

    // Title (in the hero).
    expect(screen.getAllByText("Tritanium").length).toBeGreaterThanOrEqual(1);

    // Identity & Classification cards.
    expect(screen.getByText("Identity & Classification")).toBeInTheDocument();
    expect(screen.getByText("Type ID")).toBeInTheDocument();
    expect(screen.getByText("Group")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Market Group")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();

    // Properties cards (only those with values defined). "Volume" also
    // appears as a hero quick-stat, so allow more than one match.
    expect(screen.getByText("Properties")).toBeInTheDocument();
    expect(screen.getAllByText("Volume").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Mass")).toBeInTheDocument();

    // External resource links (always shown in the hero).
    expect(screen.getByRole("link", { name: /EVE Ref/i })).toHaveAttribute(
      "href",
      "https://www.everef.net/type/30",
    );
    expect(screen.getByRole("link", { name: /EVE Tycoon/i })).toHaveAttribute(
      "href",
      "https://evetycoon.com/market/30",
    );
  });

  it("exposes Overview, Attributes, Market and Description tabs for full data", () => {
    renderPage();
    expect(screen.getByRole("tab", { name: /Overview/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Attributes/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Market/ })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Description/ }),
    ).toBeInTheDocument();
  });

  it("shows Jita market statistics on the Market tab", () => {
    renderPage();
    clickTab(/Market/);

    expect(screen.getByText("Jita / The Forge")).toBeInTheDocument();
    expect(screen.getByText("Jita Buy")).toBeInTheDocument();
    expect(screen.getByText("Jita Split")).toBeInTheDocument();
    // "Jita Sell" also appears as a hero quick-stat.
    expect(screen.getAllByText("Jita Sell").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Average Price")).toBeInTheDocument();
    expect(screen.getByText("Adjusted Price")).toBeInTheDocument();
  });

  it("groups attributes by category (with an 'Other' bucket) on the Attributes tab", () => {
    renderPage();
    clickTab(/Attributes/);

    // The section heading shares the label with the tab.
    expect(screen.getAllByText("Attributes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Armor")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
    expect(screen.getByText("Effects")).toBeInTheDocument();
  });

  it("sorts categories numerically and places the uncategorized bucket last", () => {
    mockUseType.mockReturnValue({
      data: {
        data: {
          ...FULL_TYPE_DATA,
          dogma_attributes: [
            { attribute_id: 4, value: 1 }, // -> category 9
            { attribute_id: 50, value: 2 }, // -> category 3
            { attribute_id: 999, value: 3 }, // -> other
          ],
        },
      },
    });
    mockUseQueries.mockImplementation((arg: unknown) => {
      const { queries } = arg as { queries: QueryStub[] };
      return queries.map((q) => {
        if (q.__attributeId !== undefined) {
          if (q.__attributeId === 999)
            return { data: { data: { attributeCategoryID: undefined } } };
          return {
            data: {
              data: { attributeCategoryID: q.__attributeId === 4 ? 9 : 3 },
            },
          };
        }
        if (q.__categoryId !== undefined) {
          const name = q.__categoryId === 9 ? "Required Skills" : "Fitting";
          return { data: { data: { name } } };
        }
        return { data: { data: { displayName: { en: "" } } } };
      });
    });

    renderPage();
    clickTab(/Attributes/);

    const fitting = screen.getByText("Fitting"); // category 3
    const skills = screen.getByText("Required Skills"); // category 9
    const other = screen.getByText("Other"); // uncategorized

    // Numeric order: category 3 before category 9, uncategorized last.
    expect(
      fitting.compareDocumentPosition(skills) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      skills.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("falls back to a generated category label when the name is missing", () => {
    mockUseQueries.mockImplementation((arg: unknown) => {
      const { queries } = arg as { queries: QueryStub[] };
      return queries.map((q) => {
        if (q.__attributeId !== undefined) {
          const attributeCategoryID = q.__attributeId === 999 ? undefined : 7;
          return { data: { data: { attributeCategoryID } } };
        }
        if (q.__categoryId !== undefined) {
          return { data: undefined };
        }
        return { data: { data: { displayName: { en: "" } } } };
      });
    });

    renderPage();
    clickTab(/Attributes/);
    expect(screen.getByText("Category 7")).toBeInTheDocument();
  });

  it("renders the description tab content", () => {
    renderPage();
    clickTab(/Description/);
    expect(screen.getByTestId("mail-viewer")).toHaveTextContent(
      "A common mineral.",
    );
  });

  it("hides data-less tabs and shows fallbacks when optional data is empty", () => {
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseType.mockReturnValue({ data: undefined });
    mockUseMarketPrices.mockReturnValue({ data: {} });
    mockUseFuzzworkTypeMarketStats.mockReturnValue({ data: null });
    mockUseGetUniverseGroupsGroupId.mockReturnValue({ data: undefined });
    mockUseQueries.mockReturnValue([]);

    renderPage({ typeName: "Fallback Name", typeDescription: undefined });

    // Overview still renders with "Not available" placeholders.
    expect(screen.getByText("Identity & Classification")).toBeInTheDocument();
    expect(screen.getAllByText("Not available").length).toBeGreaterThan(0);

    // Only the Overview tab is present; the rest are hidden.
    expect(screen.getByRole("tab", { name: /Overview/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /Attributes/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /Market/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /Description/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the loading state when typeId is falsy", () => {
    const TypePage = getPage();
    render(
      <MantineProvider>
        <TypePage typeId={0} />
      </MantineProvider>,
    );
    expect(
      screen.getByText("Loading type information..."),
    ).toBeInTheDocument();
  });
});
