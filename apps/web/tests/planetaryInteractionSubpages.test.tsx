import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import { CATALOG, layout, pin } from "./planetaryInteractionFixtures";

const mockOffices = jest.fn();
const mockLogin = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  CUSTOMS_OFFICES_SCOPE: "esi-planets.read_customs_offices.v1",
  useMultipleCorporationCustomsOffices: () => mockOffices(),
  useSelectedCharacter: () => null,
}));
jest.mock("@jitaspace/eve-components", () => ({
  EveEntityAvatar: () => null,
  TypeAvatar: () => null,
  SolarSystemName: ({ solarSystemId }: { solarSystemId?: number }) => (
    <span>{`system-${solarSystemId}`}</span>
  ),
  TypeName: ({ typeId }: { typeId?: number }) => (
    <span>{`type-${typeId}`}</span>
  ),
  EveEntityName: ({ entityId }: { entityId?: number }) => (
    <span>{`entity-${entityId}`}</span>
  ),
}));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("~/lib/eveOnlineLogin", () => ({
  loginWithEveOnline: (...args: unknown[]) => mockLogin(...args),
}));

const CORP_A = 98000001;
const CORP_B = 98000002;

const envelope = (
  data: unknown[],
  subjectIds: number[],
  over: Record<string, unknown> = {},
) => ({
  data,
  subjectIds,
  errors: [],
  isLoading: false,
  isPending: false,
  isError: false,
  pendingSubjectIds: [],
  refetch: () => undefined,
  ...over,
});

const office = (
  subjectId: number,
  officeId: number,
  over: Record<string, unknown> = {},
) => ({
  subjectId,
  office_id: officeId,
  system_id: 30000142 + officeId,
  allow_access_with_standings: false,
  allow_alliance_access: false,
  corporation_tax_rate: 0.1,
  reinforce_exit_start: 18,
  reinforce_exit_end: 20,
  ...over,
});

const wrap = (searchParams: string) => ({
  wrapper: withNuqsTestingAdapter({ searchParams, hasMemory: true }),
});

const bodyRows = () =>
  screen.getAllByRole("row").filter((row) => row.querySelector("td"));

describe("Customs offices page", () => {
  function renderPage(searchParams = "") {
    const Page =
      require("~/app/planetary-interaction/customs-offices/page.client").default;
    return render(
      <MantineProvider>
        <Page />
      </MantineProvider>,
      wrap(searchParams),
    );
  }

  beforeEach(() => {
    mockOffices.mockReset().mockReturnValue(envelope([], []));
    mockLogin.mockReset();
  });

  it("lists every corporation's offices with their taxes", () => {
    mockOffices.mockReturnValue(
      envelope(
        [
          office(CORP_A, 1, {
            allow_alliance_access: true,
            alliance_tax_rate: 0.05,
          }),
          office(CORP_B, 2, {
            allow_access_with_standings: true,
            standing_level: "good",
          }),
        ],
        [CORP_A, CORP_B],
      ),
    );
    renderPage();

    const rows = bodyRows();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("10%");
    expect(rows[0]).toHaveTextContent("5%");
    expect(rows[0]).toHaveTextContent("18:00–20:00");
    expect(rows[1]).toHaveTextContent("Good");
    expect(
      screen.getByText("2 customs offices across 2 corporations"),
    ).toBeInTheDocument();
    const stat = (title: string) =>
      screen.getByText(title, { selector: "p" }).closest(".mantine-Paper-root");
    expect(stat("Customs offices")).toHaveTextContent("2");
    expect(stat("Average corporation tax")).toHaveTextContent("10%");
    expect(stat("Open to alliance")).toHaveTextContent("1");
  });

  it("filters to a corporation chosen with its chip", async () => {
    mockOffices.mockReturnValue(
      envelope([office(CORP_A, 1), office(CORP_B, 2)], [CORP_A, CORP_B]),
    );
    renderPage();

    await userEvent.click(
      screen.getByRole("checkbox", { name: `entity-${CORP_A}` }),
    );

    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent(`entity-${CORP_B}`);
  });

  it("reads the corporation selection from the URL", () => {
    mockOffices.mockReturnValue(
      envelope([office(CORP_A, 1), office(CORP_B, 2)], [CORP_A, CORP_B]),
    );
    renderPage(`?corporations=${CORP_A}`);

    expect(bodyRows()).toHaveLength(1);
  });

  it("says so when no corporation is selected", () => {
    mockOffices.mockReturnValue(
      envelope([office(CORP_A, 1), office(CORP_B, 2)], [CORP_A, CORP_B]),
    );
    renderPage("?corporations=");

    expect(screen.getByText(/No corporations selected/)).toBeInTheDocument();
  });

  it("explains that only Directors can read them", async () => {
    renderPage();

    expect(screen.getByText(/Sign in with a Director/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Sign in with EVE Online" }),
    );
    expect(mockLogin).toHaveBeenCalledWith([
      "esi-planets.read_customs_offices.v1",
    ]);
  });

  it("reports a corporation that failed", () => {
    mockOffices.mockReturnValue(
      envelope([], [CORP_A], {
        errors: [{ subjectId: CORP_A, error: new Error("Forbidden") }],
      }),
    );
    renderPage();

    expect(
      screen.getByText("Some customs offices could not be loaded"),
    ).toBeInTheDocument();
  });

  it("shows skeleton rows while a selected corporation loads", () => {
    mockOffices.mockReturnValue(
      envelope([], [CORP_A], {
        isPending: true,
        pendingSubjectIds: [CORP_A],
      }),
    );
    const { container } = renderPage();

    expect(
      container.querySelectorAll("tr[data-skeleton]").length,
    ).toBeGreaterThan(0);
    expect(
      screen
        .getByText("Customs offices", { selector: "p" })
        .closest(".mantine-Paper-root"),
    ).toHaveTextContent("…");
  });
});

describe("Schematics browser", () => {
  function renderBrowser(searchParams = "", catalog = CATALOG) {
    const { SchematicsBrowser } =
      require("~/components/PlanetaryInteraction/SchematicsBrowser") as typeof import("~/components/PlanetaryInteraction/SchematicsBrowser");
    return render(
      <MantineProvider>
        <SchematicsBrowser catalog={catalog} />
      </MantineProvider>,
      wrap(searchParams),
    );
  }

  it("groups every schematic by tier", () => {
    renderBrowser();

    expect(
      screen.getByRole("heading", { name: "P1 · Basic commodities" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "P2 · Refined commodities" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByText("3 schematics")).toBeInTheDocument();
  });

  it("links a schematic to the ones that use its output", () => {
    renderBrowser();

    const water = screen.getByRole("article", { name: "Water" });
    expect(water).toHaveTextContent("30 min per run · 40 units per hour");
    expect(screen.getAllByRole("link", { name: "Coolant" })[0]).toHaveAttribute(
      "href",
      "#schematic-66",
    );
  });

  it("searches by commodity", async () => {
    renderBrowser();

    await userEvent.type(
      screen.getByRole("textbox", { name: "Search" }),
      "ionic",
    );

    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("1 of 3 schematics")).toBeInTheDocument();
  });

  it("filters by tier from the URL", () => {
    renderBrowser("?tier=2");

    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("checkbox", { name: "P1" })).not.toBeChecked();
  });

  it("toggles a tier", async () => {
    renderBrowser();

    await userEvent.click(screen.getByRole("checkbox", { name: "P2" }));

    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("says so when nothing matches", () => {
    renderBrowser("?q=nothing");

    expect(
      screen.getByText("No schematic matches your search."),
    ).toBeInTheDocument();
  });

  it("degrades without a catalog", () => {
    renderBrowser("", { schematics: [], types: {} });

    expect(
      screen.getByText(/Schematics are not available right now/),
    ).toBeInTheDocument();
  });
});

describe("Colony map", () => {
  const { ColonyMap, projectPins } =
    require("~/components/PlanetaryInteraction/ColonyMap") as typeof import("~/components/PlanetaryInteraction/ColonyMap");

  it("keeps a colony on the 0/2π seam in one piece", () => {
    // The same two pins, once straddling the seam and once mid-map, must be
    // drawn the same way: re-centring removes the wrap.
    const project = (offset: number) =>
      [
        ...projectPins([
          { pin_id: 1, latitude: Math.PI / 2, longitude: offset + 0.01 },
          {
            pin_id: 2,
            latitude: Math.PI / 2,
            longitude: (offset - 0.01 + 2 * Math.PI) % (2 * Math.PI),
          },
        ]).values(),
      ].map(({ x, y }) => [Math.round(x), Math.round(y)]);
    expect(project(0)).toEqual(project(Math.PI));
  });

  it("fits the pins inside the drawing", () => {
    const positions = projectPins([
      { pin_id: 1, latitude: 1, longitude: 1 },
      { pin_id: 2, latitude: 1.2, longitude: 1.3 },
      { pin_id: 3, latitude: 0.9, longitude: 0.8 },
    ]);
    for (const { x, y } of positions.values()) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(480);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(300);
    }
    expect(projectPins([]).size).toBe(0);
  });

  it("draws labelled pins and their links", () => {
    const command = pin({ type_id: 2254, latitude: 1, longitude: 1 });
    const storage = pin({ type_id: 2541, latitude: 1.01, longitude: 1.01 });
    const { container } = render(
      <MantineProvider>
        <ColonyMap
          layout={{
            ...layout([command, storage]),
            links: [
              {
                source_pin_id: command.pin_id,
                destination_pin_id: storage.pin_id,
                link_level: 0,
              },
              // A link to a pin that is not there is skipped.
              {
                source_pin_id: command.pin_id,
                destination_pin_id: 999999,
                link_level: 0,
              },
            ],
          }}
          catalog={CATALOG}
          label="Map of a test colony"
        />
      </MantineProvider>,
    );

    expect(
      screen.getByRole("img", { name: "Map of a test colony" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("circle")).toHaveLength(2);
    expect(container.querySelectorAll("line")).toHaveLength(1);
    expect(container.querySelector("title")).toHaveTextContent(
      "Barren Command Center",
    );
    expect(screen.getByText("Storage")).toBeInTheDocument();
  });
});
