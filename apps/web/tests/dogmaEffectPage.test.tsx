import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

import type { PageProps } from "~/app/dogma/effect/[effectId]/page.client";

// ---------------------------------------------------------------------------
// next/navigation — the page client receives props directly; mock defensively.
// ---------------------------------------------------------------------------
jest.mock("next/navigation", () => ({
  useParams: () => ({ effectId: "30" }),
  useRouter: () => ({}),
  usePathname: () => "/",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// The server page pulls in Prisma and `cacheLife`; the coverage CI job has no
// generated Prisma client, so stub both out.
jest.mock("~/lib/db", () => ({ prisma: {} }));
jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  cacheTag: () => undefined,
}));

jest.mock("@jitaspace/tiptap-eve", () => ({
  sanitizeFormattedEveString: (s: string) => s,
}));

// Anchors render their text; DogmaAttributeValue renders its raw value.
jest.mock(
  "@jitaspace/ui",
  () =>
    new Proxy(
      {},
      {
        get:
          () =>
          ({ children, value }: { children?: ReactNode; value?: number }) =>
            children ?? (value === undefined ? null : `value:${value}`),
      },
    ),
);

jest.mock("@jitaspace/eve-components", () => ({
  TypeAnchor: ({ children }: { children?: ReactNode }) => <>{children}</>,
  TypeAvatar: () => null,
}));

jest.mock(
  "@jitaspace/eve-icons",
  () =>
    new Proxy(
      {},
      {
        get: () => () => null,
      },
    ),
);

jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content?: string }) => (
    <div data-testid="mail-viewer">{content}</div>
  ),
}));

// Render every cell the columns describe, so value columns are exercised
// without depending on either table engine.
jest.mock("~/components/DataTable", () => ({
  DataTable: ({
    data,
    columns,
  }: {
    data: object[];
    columns: {
      id: string;
      header: string;
      cell?: (row: object) => ReactNode;
      defaultVisible?: boolean;
    }[];
  }) => (
    <table data-testid="types-table">
      <thead>
        <tr>
          {columns
            .filter((column) => column.defaultVisible !== false)
            .map((column) => (
              <th key={column.id}>{column.header}</th>
            ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            {columns
              .filter((column) => column.defaultVisible !== false)
              .map((column) => (
                <td key={column.id}>{column.cell?.(row)}</td>
              ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const attribute = (
  attributeId: number,
  name: string,
  displayName: string | null,
  unitId: number | null = null,
) => ({ attributeId, name, displayName, unitId, unitSymbol: null });

// Effect 5189 trackingSpeedBonusEffectLasers, plus an effect stopper so both
// sentence shapes render.
const PROPS: PageProps = {
  effectId: 5189,
  name: "trackingSpeedBonusEffectLasers",
  displayName: null,
  description: "Automatically generated effect",
  customDescription: null,
  published: false,
  iconId: null,
  guid: "effects.Laser",
  distribution: 2,
  category: { effectCategoryId: 0, name: "dgmEffPassive" },
  flags: {
    isOffensive: true,
    isAssistance: false,
    isWarpSafe: false,
    disallowAutoRepeat: false,
    electronicChance: false,
    propulsionChance: false,
    rangeChance: null,
  },
  stats: {
    discharge: 6,
    duration: null,
    range: null,
    falloff: null,
    trackingSpeed: null,
    resistance: null,
    npcUsageChance: null,
    npcActivationChance: null,
    fittingUsageChance: null,
  },
  preExpression: null,
  postExpression: 200,
  attributes: [
    attribute(6, "capacitorNeed", "Activation Cost"),
    attribute(160, "trackingSpeed", "Turret Tracking"),
    attribute(767, "trackingSpeedBonus", "Tracking Speed Bonus", 105),
  ],
  modifiers: [
    {
      modifierIndex: 0,
      func: "LocationGroupModifier",
      domain: "shipID",
      operator: 6,
      modifiedAttributeId: 160,
      modifyingAttributeId: 767,
      groupId: 53,
      groupName: "Energy Weapon",
      skillTypeId: null,
      skillName: null,
      targetEffectId: null,
      targetEffectName: null,
    },
    {
      modifierIndex: 1,
      func: "EffectStopper",
      domain: "target",
      operator: null,
      modifiedAttributeId: null,
      modifyingAttributeId: null,
      groupId: null,
      groupName: null,
      skillTypeId: null,
      skillName: null,
      targetEffectId: 6441,
      targetEffectName: "fighterAbilityMicroWarpDrive",
    },
  ],
  targetedBy: [
    {
      effectId: 5934,
      name: "warpScrambleBlockMWDWithNPCEffect",
      func: "EffectStopper",
      domain: "target",
    },
  ],
  types: [
    {
      typeId: 31378,
      name: "Small Energy Metastasis Adjuster I",
      published: true,
      groupId: 776,
      groupName: "Rig Energy Weapon",
      categoryId: 7,
      isDefault: false,
      values: { 767: 15 },
    },
    {
      typeId: 3300,
      name: "Gunnery",
      published: true,
      groupId: 255,
      groupName: "Gunnery",
      categoryId: 16,
      isDefault: true,
      values: { 767: 5 },
    },
  ],
};

function renderPage(props: Partial<PageProps> = {}) {
  const Page = require("~/app/dogma/effect/[effectId]/page.client").default;
  return render(
    <MantineProvider env="test">
      <Page {...PROPS} {...props} />
    </MantineProvider>,
  );
}

describe("Dogma effect page (client)", () => {
  it("names the effect and shows its category and flags as badges", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "trackingSpeedBonusEffectLasers" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Unpublished")).toBeInTheDocument();
    expect(screen.getAllByText("Passive").length).toBeGreaterThanOrEqual(1);
    // True flags are badges in the header and Yes in Details; false flags
    // only appear in Details, as No; unknown (null) ones nowhere.
    expect(screen.getAllByText("Offensive")).toHaveLength(2);
    expect(screen.getAllByText("Warp safe")).toHaveLength(1);
    expect(screen.queryByText("Range chance")).not.toBeInTheDocument();
    expect(screen.getByTestId("mail-viewer")).toHaveTextContent(
      "Automatically generated effect",
    );
  });

  it("shows the internal name under a display name that differs", () => {
    renderPage({ displayName: "Tracking Speed Bonus" });
    expect(
      screen.getByRole("heading", { name: "Tracking Speed Bonus" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("trackingSpeedBonusEffectLasers").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("lists the attributes the effect points at under Stats used", () => {
    renderPage();
    expect(screen.getByText("Stats used")).toBeInTheDocument();
    expect(screen.getByText("Activation cost")).toBeInTheDocument();
    expect(screen.getByText("Activation Cost")).toBeInTheDocument();
  });

  it("reads each modifier as a sentence with its raw rows expanded", () => {
    renderPage();
    const sentence = screen.getByText(
      (_, element) =>
        element?.tagName === "P" &&
        element.textContent ===
          "Energy Weapon on the ship›Turret Tracking + Tracking Speed Bonus %",
    );
    expect(sentence).toBeInTheDocument();
    expect(screen.getByText("percent")).toBeInTheDocument();

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          element.textContent ===
            "Stops fighterAbilityMicroWarpDrive on the target",
      ),
    ).toBeInTheDocument();

    // Raw rows start expanded and can be collapsed per line.
    expect(screen.getAllByText("LocationGroupModifier")).toHaveLength(1);
    expect(screen.getAllByText("PostPercent")).toHaveLength(1);
    fireEvent.click(screen.getAllByRole("button", { name: "Hide raw" })[0]!);
    expect(screen.queryByText("LocationGroupModifier")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Show raw" })).toHaveLength(1);
  });

  it("lists the effects that target this one", () => {
    renderPage();
    expect(screen.getByText("Targeted by")).toBeInTheDocument();
    expect(screen.getByText("Stopped by")).toBeInTheDocument();
    expect(
      screen.getByText("warpScrambleBlockMWDWithNPCEffect"),
    ).toBeInTheDocument();
  });

  it("adds a column for each modifying attribute, per level for skills", () => {
    renderPage();
    const table = screen.getByTestId("types-table");
    expect(table).toHaveTextContent("Tracking Speed Bonus");
    expect(table).toHaveTextContent("value:15");
    expect(table).toHaveTextContent("value:5/ level");
    expect(screen.getByText(/2 types in 2 groups/)).toBeInTheDocument();
  });

  it("explains empty modifiers and types instead of empty tables", () => {
    renderPage({ modifiers: [], types: [], targetedBy: [] });
    expect(
      screen.getByText(/This effect has no modifiers/),
    ).toBeInTheDocument();
    expect(screen.getByText("No item uses this effect.")).toBeInTheDocument();
    expect(screen.queryByTestId("types-table")).not.toBeInTheDocument();
    expect(screen.queryByText("Targeted by")).not.toBeInTheDocument();
  });

  it("shows the custom description, labelled, in place of CCP's placeholder", () => {
    renderPage({
      customDescription: "Increases the tracking speed of energy turrets.",
    });
    expect(
      screen.getByText("Increases the tracking speed of energy turrets."),
    ).toBeInTheDocument();
    expect(screen.getByText("AI-generated")).toBeInTheDocument();
    expect(screen.queryByTestId("mail-viewer")).not.toBeInTheDocument();
  });

  it("shows the custom description when CCP has none at all", () => {
    renderPage({ description: null, customDescription: "Stops warping." });
    expect(screen.getByText("Stops warping.")).toBeInTheDocument();
    expect(screen.getByText("AI-generated")).toBeInTheDocument();
  });

  it("prefers CCP's own description over the custom one", () => {
    renderPage({
      description: "Attempts to prevent the target from warping.",
      customDescription: "Stops warping.",
    });
    expect(screen.getByTestId("mail-viewer")).toHaveTextContent(
      "Attempts to prevent the target from warping.",
    );
    expect(screen.queryByText("Stops warping.")).not.toBeInTheDocument();
    expect(screen.queryByText("AI-generated")).not.toBeInTheDocument();
  });

  it("falls back to the effect id when it has no name at all", () => {
    renderPage({ name: null, displayName: null, description: null });
    expect(
      screen.getByRole("heading", { name: "Effect 5189" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("mail-viewer")).not.toBeInTheDocument();
  });
});

// The server wrapper resolves `params` inside the Suspense boundary, so reach
// its content component the same way React would rather than rendering the
// async function as a client component.
async function resolvePageContent(effectId: string) {
  const Page = require("~/app/dogma/effect/[effectId]/page").default;
  const suspenseEl = Page({ params: Promise.resolve({ effectId }) });
  const contentEl = suspenseEl.props.children as {
    type: (props: unknown) => Promise<ReactNode>;
    props: unknown;
  };
  return contentEl.type(contentEl.props);
}

// The guard used to be `Number.isFinite`, which let `/dogma/effect/-1` and
// `/dogma/effect/016` render a 200 apiece — extra URLs for a page far too heavy
// to be crawled twice, which is why these are kept out of the sitemap entirely.
describe("dogma effect page id validation", () => {
  it.each(["0", "-1", "016", "16.0", "bad", ""])(
    "404s rather than serving a second URL for %p",
    async (effectId) => {
      await expect(resolvePageContent(effectId)).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
    },
  );
});
