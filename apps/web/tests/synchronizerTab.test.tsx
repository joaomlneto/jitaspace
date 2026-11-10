import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";

import type * as SynchronizerTabModule from "~/app/type/[typeId]/SynchronizerTab";
import type { SynchronizerRig, TypeSynchronizer } from "~/lib/synchronizer";

// Loaded lazily, as the other tab tests do.
const load = () =>
  require("~/app/type/[typeId]/SynchronizerTab") as typeof SynchronizerTabModule;

const percent = (attributeId: number, name: string, base: number) => ({
  attributeId,
  name,
  unitId: 105,
  unitSymbol: "%",
  base,
  appliesTo: [],
});

/** The Large Dread Guristas Synchronizer, as the data layer returns it. */
const dreadGuristas: SynchronizerRig = {
  counterAttributeId: 6379,
  counterName: "Dread Guristas Modules Fitted",
  counterBase: 0,
  scaling: [
    { ...percent(1255, "Drone Damage Bonus", 10), direction: 1 },
    {
      ...percent(327, "Hitpoint Bonus", 10),
      direction: 1,
      appliesTo: [
        { text: "Increases drone shield.", source: "ai" },
        { text: "Increases drone armor.", source: "ai" },
        { text: "Increases drone structure.", source: "ai" },
      ],
    },
    { ...percent(984, "EM Damage Resistance Bonus", -5), direction: -1 },
  ],
  fixed: [
    {
      ...percent(1138, "Drawback", -10),
      skills: [
        {
          typeId: 96100,
          name: "Synchronization Rigging",
          percentPerLevel: -10,
        },
      ],
    },
    percent(6397, "Drone Maximum Control Range Penalty", -60),
  ],
  modules: [
    {
      typeId: 13965,
      name: "Dread Guristas EM Shield Hardener",
      groupId: 77,
      groupName: "Shield Hardener",
      amount: 1,
    },
    {
      typeId: 14246,
      name: "Dread Guristas Warp Disruptor",
      groupId: 52,
      groupName: "Warp Scrambler",
      amount: 1,
    },
  ],
};

const renderTab = (synchronizer: TypeSynchronizer) => {
  const { SynchronizerTab } = load();
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MantineProvider env="test">
        <SynchronizerTab synchronizer={synchronizer} />
      </MantineProvider>
    </QueryClientProvider>,
  );
};

/** A table row's cells, by the attribute named in its first cell. */
const cells = (name: string) =>
  within(screen.getByRole("link", { name }).closest("tr") as HTMLElement)
    .getAllByRole("cell")
    .map((cell) => cell.textContent);

describe("SynchronizerTab on a rig", () => {
  it("starts at four modules: 10% → 14%, and -5% → -9% resistance", () => {
    renderTab({ rig: dreadGuristas, countsTowards: [] });
    expect(screen.getByText("Matching modules fitted: 4")).toBeInTheDocument();
    expect(cells("Drone Damage Bonus").slice(1)).toEqual(["10%", "14%", "+1"]);
    expect(cells("EM Damage Resistance Bonus").slice(1)).toEqual([
      "-5%",
      "-9%",
      "−1",
    ]);
  });

  it("follows the slider", () => {
    renderTab({ rig: dreadGuristas, countsTowards: [] });
    const slider = screen.getByRole("slider", {
      name: "Matching modules fitted",
    });
    fireEvent.keyDown(slider, { key: "End" });
    expect(screen.getByText("Matching modules fitted: 24")).toBeInTheDocument();
    expect(cells("Drone Damage Bonus")[2]).toBe("34%");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(cells("EM Damage Resistance Bonus")[2]).toBe("-5%");
  });

  it("shows the CPU drawback at each level of Synchronization Rigging", () => {
    renderTab({ rig: dreadGuristas, countsTowards: [] });
    const drawback = cells("Drawback");
    expect(drawback[1]).toBe("-10%");
    // Expansion notes: a 10% reduction in the CPU penalty per level.
    expect(drawback[2]).toContain("Synchronization Rigging");
    for (const [level, value] of [
      [1, "-9%"],
      [3, "-7%"],
      [5, "-5%"],
    ] as const) {
      expect(drawback[2]).toContain(`${level}: ${value}`);
    }
    // The drone range penalty neither scales nor has a skill.
    expect(cells("Drone Maximum Control Range Penalty").slice(1)).toEqual([
      "-60%",
      "—",
    ]);
  });

  it("lists the matching modules by group", () => {
    renderTab({ rig: dreadGuristas, countsTowards: [] });
    expect(screen.getByText("Matching modules (2)")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Dread Guristas Warp Disruptor" }),
    ).toHaveAttribute("href", "/type/14246");
  });
});

describe("SynchronizerTab descriptions", () => {
  it("shows every effect's description under a bonus", () => {
    renderTab({ rig: dreadGuristas, countsTowards: [] });
    for (const layer of ["shield", "armor", "structure"]) {
      expect(screen.getByText(`Increases drone ${layer}.`)).toBeInTheDocument();
    }
  });
});

describe("SynchronizerTab on a module", () => {
  it("lists the rigs the module powers", () => {
    renderTab({
      rig: null,
      countsTowards: [
        {
          typeId: 96145,
          name: "Large Caldari Navy Synchronizer",
          counterName: "Caldari Navy Modules Fitted",
          amount: 1,
        },
      ],
    });
    expect(
      screen.getByRole("link", { name: "Large Caldari Navy Synchronizer" }),
    ).toHaveAttribute("href", "/type/96145");
    expect(
      screen.getByText("+1 to Caldari Navy Modules Fitted"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/online/i)).toBeNull();
  });
});
