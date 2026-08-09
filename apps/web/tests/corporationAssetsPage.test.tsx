import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

interface TaggedAsset {
  item_id: number;
  subjectId: number;
  [key: string]: unknown;
}
const mockUseMultipleCorporationAssets = jest.fn<
  () => {
    data: TaggedAsset[];
    isPending: boolean;
    errors: { subjectId: number; error: Error }[];
  }
>();
const mockUseEsiNameLookup =
  jest.fn<
    (
      ...args: unknown[]
    ) => Record<string, { value?: { name: string } } | undefined>
  >();
const mockUseMarketPrices =
  jest.fn<
    (...args: unknown[]) => {
      data: Record<number, { adjusted_price?: number }>;
    }
  >();

jest.mock("@jitaspace/hooks", () => ({
  useMultipleCorporationAssets: () => mockUseMultipleCorporationAssets(),
  useEsiNameLookup: (...args: unknown[]) => mockUseEsiNameLookup(...args),
  useMarketPrices: () => mockUseMarketPrices(),
}));

jest.mock("@jitaspace/ui", () => ({
  TypeAvatar: () => null,
  TypeAnchor: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
  TypeName: ({ typeId }: { typeId: number }) => (
    <span data-testid={`type-name-${typeId}`}>{typeId}</span>
  ),
  EveEntityAnchor: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
  EveEntityName: ({ entityId }: { entityId: number }) => (
    <span data-testid={`entity-name-${entityId}`}>{entityId}</span>
  ),
}));

jest.mock("@jitaspace/eve-components", () => ({
  ...jest.requireActual<Record<string, unknown>>(
    "../__mocks__/@jitaspace/eve-components",
  ),
  // A button per option, so a corporation can actually be picked.
  EveEntitySelect: ({
    label,
    entityIds,
    onChange,
  }: {
    label?: string;
    entityIds?: { id: number }[];
    onChange?: (value: string | null) => void;
  }) => (
    <div data-testid={`select:${label}`}>
      {(entityIds ?? []).map(({ id }) => (
        <button
          key={id}
          data-testid={`option:${id}`}
          onClick={() => onChange?.(String(id))}
        >
          {id}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  AssetsIcon: () => null,
  AttentionIcon: () => null,
}));

jest.mock("~/components/ScopeGuard", () => ({
  ScopeGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const CORP = 987654321;
const OTHER_CORP = 555000111;
const SAMPLE_ASSETS: TaggedAsset[] = [
  {
    item_id: 2001,
    subjectId: CORP,
    type_id: 34,
    quantity: 1000,
    location_id: 60003760,
    location_type: "station",
    is_singleton: false,
    is_blueprint_copy: false,
  },
  {
    item_id: 2002,
    subjectId: CORP,
    type_id: 35,
    quantity: 50,
    location_id: 60003760,
    location_type: "item",
    is_singleton: false,
    is_blueprint_copy: false,
  }, // filtered out
  {
    item_id: 2003,
    subjectId: CORP,
    type_id: 36,
    quantity: 300,
    location_id: 60008526,
    location_type: "station",
    is_singleton: true,
    is_blueprint_copy: false,
  },
  {
    item_id: 2004,
    subjectId: CORP,
    type_id: 37,
    quantity: 1,
    location_id: 60008526,
    location_type: "station",
    is_singleton: false,
    is_blueprint_copy: true,
  },
];

function renderPage() {
  const Page = require("~/app/assets/corporation/page").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("Corporation Assets Page", () => {
  beforeEach(() => {
    mockUseMultipleCorporationAssets.mockReturnValue({
      data: SAMPLE_ASSETS,
      isPending: false,
      errors: [],
    });
    mockUseEsiNameLookup.mockReturnValue({
      "34": { value: { name: "Tritanium" } },
      "36": { value: { name: "Mexallon" } },
      "37": { value: { name: "Isogen" } },
    });
    mockUseMarketPrices.mockReturnValue({ data: {} });
  });

  it("renders the Corporation Assets title", () => {
    renderPage();
    expect(screen.getByText("Corporation Assets")).toBeInTheDocument();
  });

  it("offers no corporation filter when there is only one", () => {
    renderPage();
    // A single-choice dropdown is noise, and one corporation is the norm.
    expect(screen.queryByTestId("select:Filter by corporation")).toBeNull();
  });

  it("shows total asset count", () => {
    renderPage();
    // Object.keys(SAMPLE_ASSETS).length = 4
    expect(screen.getByText("4 assets")).toBeInTheDocument();
  });

  it("filters out assets with location_type 'item'", () => {
    renderPage();
    // 2002 has location_type=item, so 3 rows should render
    expect(screen.getAllByRole("row")).toHaveLength(4); // 1 header + 3 data rows
  });

  it("names how many corporations could not be read, and keeps the rest", () => {
    mockUseMultipleCorporationAssets.mockReturnValue({
      data: SAMPLE_ASSETS,
      isPending: false,
      errors: [{ subjectId: OTHER_CORP, error: new Error("boom") }],
    });
    renderPage();

    expect(
      screen.getByText(/1 corporation could not be read/),
    ).toBeInTheDocument();
    // The readable corporation's assets still render — previously any error
    // replaced the whole table.
    expect(screen.getByText("4 assets")).toBeInTheDocument();
  });

  it("pluralises the failure notice", () => {
    mockUseMultipleCorporationAssets.mockReturnValue({
      data: SAMPLE_ASSETS,
      isPending: false,
      errors: [
        { subjectId: CORP, error: new Error("boom") },
        { subjectId: OTHER_CORP, error: new Error("boom") },
      ],
    });
    renderPage();
    expect(
      screen.getByText(/2 corporations could not be read/),
    ).toBeInTheDocument();
  });

  it("explains the Director requirement rather than reporting an error", () => {
    // Reading corporation assets needs Director, which most members lack. With
    // roles enforced, such a corporation is simply not a subject — this used to
    // surface as a red "Token not available".
    mockUseMultipleCorporationAssets.mockReturnValue({
      data: [],
      isPending: false,
      errors: [],
    });
    renderPage();

    expect(screen.getByText(/needs the Director role/)).toBeInTheDocument();
    expect(screen.queryByText(/assets$/)).toBeNull();
  });

  it("lets a corporation be picked when a character can read more than one", () => {
    mockUseMultipleCorporationAssets.mockReturnValue({
      data: [
        ...SAMPLE_ASSETS,
        {
          item_id: 3001,
          subjectId: OTHER_CORP,
          type_id: 34,
          quantity: 7,
          location_id: 60003760,
          location_type: "station",
          is_singleton: false,
          is_blueprint_copy: false,
        },
      ],
      isPending: false,
      errors: [],
    });
    renderPage();
    expect(screen.getByText("5 assets")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`option:${OTHER_CORP}`));

    expect(screen.getByText("1 assets")).toBeInTheDocument();
  });

  it("shows 'assembled' badge for singleton items", () => {
    renderPage();
    expect(screen.getByText("assembled")).toBeInTheDocument();
  });

  it("shows 'BPC' badge for blueprint copies", () => {
    renderPage();
    expect(screen.getByText("BPC")).toBeInTheDocument();
  });

  it("shows unresolved-names warning when some names are missing", () => {
    mockUseEsiNameLookup.mockReturnValue({});
    renderPage();
    expect(screen.getByText(/Failed to resolve names for/)).toBeInTheDocument();
  });
});
