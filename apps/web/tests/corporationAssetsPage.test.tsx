import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";

interface TaggedAsset {
  item_id: number;
  subjectId: number;
  [key: string]: unknown;
}
const mockUseMultipleCorporationAssets = jest.fn<
  () => {
    data: TaggedAsset[];
    subjectIds: number[];
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
const mockUseMarketPrices = jest.fn<
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

/**
 * `subjectIds` is the corporations that were queried; `data` is what came back.
 * They are deliberately separate arguments here, because every case worth
 * testing is one where they disagree.
 */
const envelope = (
  subjectIds: number[],
  data: TaggedAsset[],
  over: Partial<{
    isPending: boolean;
    errors: { subjectId: number; error: Error }[];
  }> = {},
) => ({
  data,
  subjectIds,
  isPending: false,
  errors: [],
  ...over,
});

const failure = (subjectId: number) => ({
  subjectId,
  error: new Error("boom"),
});

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
    mockUseMultipleCorporationAssets.mockReturnValue(
      envelope([CORP], SAMPLE_ASSETS),
    );
    mockUseEsiNameLookup.mockReturnValue({
      "34": { value: { name: "Tritanium" } },
      "36": { value: { name: "Zydrine" } },
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

  it("always renders the Location column", () => {
    // Both the header and the cells used to be conditioned on a location
    // filter — one that had no control anywhere on the page and so could
    // never be set. Nothing hides the column now.
    renderPage();

    expect(
      screen.getByRole("columnheader", { name: "Location" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(4);

    const [, ...dataRows] = screen.getAllByRole("row");
    expect(dataRows).toHaveLength(3);
    for (const row of dataRows) {
      expect(within(row).getAllByRole("cell")).toHaveLength(4);
    }
  });

  it("orders rows by resolved type name, not by type id", () => {
    // Isogen (37), Tritanium (34), Zydrine (36). The names are chosen so this
    // order matches no comparator over the underlying fields — not arrival
    // order, and not item_id, type_id or quantity in either direction — so it
    // fails if the sort is dropped, reversed, or reads anything but the
    // resolved name.
    renderPage();

    const rendered = screen
      .getAllByTestId("type-name")
      .map((element) => element.textContent);
    expect(rendered).toEqual(["type-37", "type-34", "type-36"]);
  });

  it("names how many corporations could not be read, and keeps the rest", () => {
    mockUseMultipleCorporationAssets.mockReturnValue(
      envelope([CORP, OTHER_CORP], SAMPLE_ASSETS, {
        errors: [failure(OTHER_CORP)],
      }),
    );
    renderPage();

    expect(
      screen.getByText(/Could not read assets for 1 corporation/),
    ).toBeInTheDocument();
    // The readable corporation's assets still render — previously any error
    // replaced the whole table.
    expect(screen.getByText("4 assets")).toBeInTheDocument();
  });

  it("pluralises the failure notice", () => {
    mockUseMultipleCorporationAssets.mockReturnValue(
      envelope([CORP, OTHER_CORP], SAMPLE_ASSETS, {
        errors: [failure(CORP), failure(OTHER_CORP)],
      }),
    );
    renderPage();
    expect(
      screen.getByText(/Could not read assets for 2 corporations/),
    ).toBeInTheDocument();
  });

  it("explains the Director requirement rather than reporting an error", () => {
    // Reading corporation assets needs Director, which most members lack. With
    // roles enforced, such a corporation is simply not a subject — this used to
    // surface as a red "Token not available". No subject, so no query ran.
    mockUseMultipleCorporationAssets.mockReturnValue(envelope([], []));
    renderPage();

    expect(screen.getByText(/needs the Director role/)).toBeInTheDocument();
    expect(screen.queryByText(/assets$/)).toBeNull();
  });

  it("shows an empty table, not the Director message, for a corporation that owns nothing", () => {
    // The query ran and legitimately returned nothing. Deriving the corporation
    // list from the rows would make this indistinguishable from holding no
    // role, and tell a Director they are not one.
    mockUseMultipleCorporationAssets.mockReturnValue(envelope([CORP], []));
    renderPage();

    expect(screen.queryByText(/needs the Director role/)).toBeNull();
    expect(screen.getByText("0 assets")).toBeInTheDocument();
  });

  it("reports only the failure when every readable corporation errors", () => {
    // Both alerts used to render together: one claiming a readable remainder,
    // the other claiming nothing was readable at all.
    mockUseMultipleCorporationAssets.mockReturnValue(
      envelope([CORP], [], { errors: [failure(CORP)] }),
    );
    renderPage();

    expect(
      screen.getByText(/Could not read assets for 1 corporation/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/needs the Director role/)).toBeNull();
  });

  it("says nothing about permissions while the first load is still running", () => {
    // Before the auth store rehydrates there are no subjects yet, so the empty
    // state has to wait for isPending or it flashes on every page load.
    mockUseMultipleCorporationAssets.mockReturnValue(
      envelope([], [], { isPending: true }),
    );
    renderPage();

    expect(screen.queryByText(/needs the Director role/)).toBeNull();
  });

  const OTHER_CORP_ASSET: TaggedAsset = {
    item_id: 3001,
    subjectId: OTHER_CORP,
    type_id: 34,
    quantity: 7,
    location_id: 60003760,
    location_type: "station",
    is_singleton: false,
    is_blueprint_copy: false,
  };

  it("lets a corporation be picked when a character can read more than one", () => {
    mockUseMultipleCorporationAssets.mockReturnValue(
      envelope([CORP, OTHER_CORP], [...SAMPLE_ASSETS, OTHER_CORP_ASSET]),
    );
    renderPage();
    expect(screen.getByText("5 assets")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`option:${OTHER_CORP}`));

    expect(screen.getByText("1 assets")).toBeInTheDocument();
  });

  it("offers a corporation that owns nothing, and shows it as empty", () => {
    // The options come from the corporations that were queried, so one holding
    // no assets is still a choice — and picking it says "0", not "5".
    mockUseMultipleCorporationAssets.mockReturnValue(
      envelope([CORP, OTHER_CORP], SAMPLE_ASSETS),
    );
    renderPage();

    fireEvent.click(screen.getByTestId(`option:${OTHER_CORP}`));

    expect(screen.getByText("0 assets")).toBeInTheDocument();
  });

  it("ignores a pick for a corporation that is no longer readable", () => {
    // A token can expire mid-session. Honouring the stale pick would filter
    // every remaining asset away and leave no control to undo it, because the
    // select unmounts once only one corporation is left.
    mockUseMultipleCorporationAssets.mockReturnValue(
      envelope([CORP, OTHER_CORP], [...SAMPLE_ASSETS, OTHER_CORP_ASSET]),
    );
    const { rerender } = renderPage();

    fireEvent.click(screen.getByTestId(`option:${OTHER_CORP}`));
    expect(screen.getByText("1 assets")).toBeInTheDocument();

    mockUseMultipleCorporationAssets.mockReturnValue(
      envelope([CORP], SAMPLE_ASSETS),
    );
    const Page = require("~/app/assets/corporation/page")
      .default as () => ReactNode;
    rerender(
      <MantineProvider>
        <Page />
      </MantineProvider>,
    );

    expect(screen.getByText("4 assets")).toBeInTheDocument();
  });

  it("returns to a valid page when narrowing to a smaller corporation", () => {
    // usePagination clamps in setPage but never re-derives `active` when
    // `total` shrinks, so an unclamped index slices an empty window out of a
    // table the header says is not empty.
    const bulk = (subjectId: number, from: number, count: number) =>
      Array.from({ length: count }, (_, i) => ({
        item_id: from + i,
        subjectId,
        type_id: 34,
        quantity: 1,
        location_id: 60003760,
        location_type: "station",
        is_singleton: false,
        is_blueprint_copy: false,
      }));
    mockUseMultipleCorporationAssets.mockReturnValue(
      envelope(
        [CORP, OTHER_CORP],
        [...bulk(CORP, 10000, 150), ...bulk(OTHER_CORP, 20000, 40)],
      ),
    );
    renderPage();

    // 190 assets over two pages; go to the second one.
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getAllByRole("row")).toHaveLength(91); // header + 90

    // OTHER_CORP has 40 assets, so page 2 no longer exists.
    fireEvent.click(screen.getByTestId(`option:${OTHER_CORP}`));

    expect(screen.getByText("40 assets")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(41); // header + 40
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
