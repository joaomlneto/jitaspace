import "@testing-library/jest-dom/jest-globals";

import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import type { EpicArcRow } from "~/app/epic-arcs/page.client";
import type { EpicArc, EpicArcStep } from "~/lib/epicArcs";
import type { AgentRef } from "~/lib/missionRefs";
import EpicArcPage from "~/app/epic-arc/[epicArcId]/page.client";
import EpicArcsPage from "~/app/epic-arcs/page.client";
import { EpicArcStepsTable } from "~/components/Missions";

// The epic arc UI: the steps table shared with the mission page, the arc
// page's tabs, and the /epic-arcs index. The @jitaspace/* packages resolve to
// their stubs in __mocks__.

jest.mock("~/app/history/EntityHistory", () => ({
  EmbeddedEntityHistory: ({
    history,
  }: {
    history: { entityId: number } | null;
  }) => (
    <div data-testid="entity-history">
      {history ? `history of ${history.entityId}` : "no history"}
    </div>
  ),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const agent = (
  characterId: number,
  name: string,
  regionName: string,
): AgentRef => ({
  characterId,
  name,
  level: 1,
  agentTypeName: null,
  divisionName: "Security",
  corporationId: 1000130,
  corporationName: "Sisters of EVE",
  corporationFactionId: null,
  corporationFactionName: null,
  stationId: 60012607,
  stationName: "Arnon IX - Moon 3",
  solarSystemId: 30003504,
  solarSystemName: "Arnon",
  constellationId: null,
  constellationName: null,
  regionId: null,
  regionName,
});

const ALITURA = agent(3019356, "Sister Alitura", "Essence");
const TEVIS = agent(3019358, "Tevis Jak", "Outer Ring");

const step = (overrides: Partial<EpicArcStep> & { missionId: number }) => ({
  name: `Mission ${overrides.missionId}`,
  kind: "other" as const,
  rewardIsk: null,
  bonusIsk: null,
  chapterTitle: null,
  agent: ALITURA,
  failMissionId: null,
  nextMissionIds: [],
  ...overrides,
});

// 1 → 2 → (3 | 4): a choice at 2, endings at 3 and 4.
const STEPS: EpicArcStep[] = [
  step({
    missionId: 1,
    name: "A Beacon Beckons",
    chapterTitle: "Quality of Mercy",
    kind: "kill",
    rewardIsk: 100000,
    nextMissionIds: [2],
  }),
  step({
    missionId: 2,
    name: "The Missing Piece",
    agent: TEVIS,
    failMissionId: 2,
    bonusIsk: 50000,
    nextMissionIds: [3, 4],
  }),
  step({ missionId: 3, name: "Gallente Ending", failMissionId: 1 }),
  step({ missionId: 4, name: "Caldari Ending" }),
];

const ARC: EpicArc = {
  epicArcId: 29,
  name: "The Blood-Stained Stars",
  faction: { factionId: 500016, name: "Servant Sisters of EVE" },
  iconId: 3807,
  arcRestartInterval: 129600,
  steps: STEPS,
};

const renderUi = (ui: ReactElement, searchParams = "") =>
  render(<MantineProvider>{ui}</MantineProvider>, {
    wrapper: withNuqsTestingAdapter({ searchParams }),
  });

/**
 * The table row whose subject column holds `text`: the steps table names its
 * mission in column 1, the agents and index tables their subject in column 0.
 * Other columns repeat names as links, so the column matters.
 */
const rowOf = (text: string, column = 1) => {
  const row = screen
    .getAllByRole("row")
    .find((tr) =>
      tr.querySelectorAll("td")[column]?.textContent.includes(text),
    );
  if (!row) throw new Error(`no row for ${text}`);
  return within(row);
};

describe("EpicArcStepsTable", () => {
  it("lists every step with its chapter, reward, next steps and failure", () => {
    renderUi(<EpicArcStepsTable steps={STEPS} />);

    expect(screen.getByText("Quality of Mercy")).toBeInTheDocument();

    const first = rowOf("A Beacon Beckons");
    expect(first.getByText("Encounter")).toBeInTheDocument();
    expect(first.getByText("The Missing Piece")).toHaveAttribute(
      "href",
      "/mission/2",
    );
    // No failure route on the first step.
    expect(first.getAllByText("—").length).toBeGreaterThan(0);

    const choice = rowOf("The Missing Piece");
    expect(choice.getByText("Gallente Ending")).toBeInTheDocument();
    expect(choice.getByText("Caldari Ending")).toBeInTheDocument();
    expect(choice.getByText("Retry")).toBeInTheDocument();
    expect(choice.getByText(/bonus/)).toBeInTheDocument();

    const ending = rowOf("Gallente Ending");
    expect(ending.getByText("End of arc")).toBeInTheDocument();
    // Failing it sends the pilot back to step 1.
    expect(ending.getByText("A Beacon Beckons")).toHaveAttribute(
      "href",
      "/mission/1",
    );
  });

  it("highlights the current step and leaves it unlinked", () => {
    renderUi(<EpicArcStepsTable steps={STEPS} currentMissionId={2} />);

    const current = screen
      .getAllByText("The Missing Piece")
      .find((element) => element.closest("a") === null);
    expect(current).toBeDefined();
  });
});

describe("epic arc page", () => {
  it("shows the arc's figures and where it starts, branches and ends", () => {
    renderUi(<EpicArcPage arc={ARC} history={null} />);

    expect(
      screen.getByRole("heading", { name: "The Blood-Stained Stars" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Every 90 days")).toBeInTheDocument();
    expect(
      screen.getByText("1 encounter · 3 talk-to steps"),
    ).toBeInTheDocument();
    expect(screen.getByText("Where It Starts")).toBeInTheDocument();
    expect(screen.getByText("Where It Branches")).toBeInTheDocument();
    expect(screen.getByText(/Leads to/)).toHaveTextContent(
      "Leads to Gallente Ending or Caldari Ending",
    );
    expect(screen.getByText("Where It Ends")).toBeInTheDocument();
  });

  it("opens the agents tab from the URL", () => {
    renderUi(<EpicArcPage arc={ARC} history={null} />, "?tab=agents");

    const tevis = rowOf("Tevis Jak", 0);
    expect(tevis.getByText("1")).toBeInTheDocument();
    expect(tevis.getByText("The Missing Piece")).toHaveAttribute(
      "href",
      "/mission/2",
    );
    expect(rowOf("Sister Alitura", 0).getByText("3")).toBeInTheDocument();
  });

  it("says when an arc does not repeat on a timer", () => {
    renderUi(
      <EpicArcPage
        arc={{ ...ARC, faction: null, arcRestartInterval: 1 }}
        history={null}
      />,
    );
    expect(screen.getByText("Not on a timer")).toBeInTheDocument();
  });
});

describe("/epic-arcs", () => {
  const row = (overrides: Partial<EpicArcRow>): EpicArcRow => ({
    epicArcId: 29,
    name: "The Blood-Stained Stars",
    iconId: 3807,
    factionId: 500016,
    factionName: "Servant Sisters of EVE",
    arcRestartInterval: 129600,
    missionCount: 64,
    agentCount: 12,
    chapterCount: 7,
    choiceCount: 2,
    endingCount: 4,
    totalIsk: 13_800_000,
    startAgents: [ALITURA],
    ...overrides,
  });

  it("links each arc and lists every agent it can start with", () => {
    renderUi(
      <EpicArcsPage
        arcs={[
          row({}),
          row({
            epicArcId: 56,
            name: "Angel Sound",
            factionId: null,
            factionName: null,
            arcRestartInterval: 1,
            startAgents: [ALITURA, TEVIS],
          }),
        ]}
      />,
    );

    expect(screen.getByText("The Blood-Stained Stars")).toHaveAttribute(
      "href",
      "/epic-arc/29",
    );
    const angel = rowOf("Angel Sound", 0);
    expect(angel.getByText("Sister Alitura")).toBeInTheDocument();
    expect(angel.getByText("Tevis Jak")).toBeInTheDocument();
    expect(angel.getByText("No")).toBeInTheDocument();
    expect(
      rowOf("The Blood-Stained Stars", 0).getByText("Every 90 days"),
    ).toBeInTheDocument();
  });
});
