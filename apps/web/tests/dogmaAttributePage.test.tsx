import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import type {
  AttributeModifierRow,
  PageProps,
} from "~/app/dogma/attribute/[attributeId]/page.client";
import { packTypeRows } from "~/lib/dogmaAttributeTypes";

jest.mock("@jitaspace/tiptap-eve", () => ({
  sanitizeFormattedEveString: (s: string) => s,
}));

// The server page pulls in Prisma and `cacheLife`; the coverage CI job has no
// generated Prisma client, so stub both out.
jest.mock("~/lib/db", () => ({ prisma: {} }));
jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  cacheTag: () => undefined,
}));
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
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
  TypeAvatar: () => null,
}));

jest.mock("~/components/Anchor", () => ({
  ...jest.requireActual<Record<string, unknown>>(
    "../__mocks__/components/Anchor",
  ),
  TypeAnchor: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content?: string }) => (
    <div data-testid="mail-viewer">{content}</div>
  ),
}));

// Render every visible cell, so the columns are exercised without an engine.
jest.mock("~/components/DataTable", () => ({
  DataTable: ({
    data,
    columns,
    isLoading,
  }: {
    data: object[];
    isLoading?: boolean;
    columns: {
      id: string;
      header: string;
      cell?: (row: object) => ReactNode;
      defaultVisible?: boolean;
    }[];
  }) =>
    isLoading ? (
      <div data-testid="table-loading" />
    ) : (
      <table>
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

const mockUseEntityTable = jest.fn();
jest.mock("~/components/EntityPage", () => ({
  ...jest.requireActual<object>("~/components/EntityPage"),
  useEntityTable: (...args: unknown[]) => mockUseEntityTable(...args),
}));

const modifier = (
  overrides: Partial<AttributeModifierRow>,
): AttributeModifierRow => ({
  effectId: 5189,
  effectName: "trackingSpeedBonusEffectLasers",
  carrierCount: 58,
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
  ...overrides,
});

const PROPS: PageProps = {
  attributeId: 160,
  name: "trackingSpeed",
  displayName: "Turret Tracking",
  customDescription:
    'How fast a turret can follow its target; raised by the <a href="/dogma/attribute/767">Tracking Speed Bonus</a>.',
  description: "Weapon accuracy",
  tooltipTitle: "Turret Tracking",
  tooltipDescription: "How fast a turret can follow a moving target.",
  defaultValue: 0,
  highIsGood: true,
  published: true,
  stackable: false,
  displayWhenZero: false,
  dataType: 5,
  iconId: null,
  unit: {
    unitId: 117,
    name: "radians/second",
    displayName: null,
    description: null,
  },
  category: {
    categoryId: 7,
    name: "Turrets",
    description: "Turret attributes",
  },
  minAttribute: null,
  maxAttribute: {
    attributeId: 2033,
    name: "maxTrackingSpeed",
    displayName: "Maximum Tracking",
  },
  chargeRechargeTimeAttribute: null,
  itemCount: 2,
  valueRange: { min: 0.01, max: 0.5 },
  attributes: [
    {
      attributeId: 160,
      name: "trackingSpeed",
      displayName: "Turret Tracking",
      unitId: null,
      unitSymbol: null,
    },
    {
      attributeId: 767,
      name: "trackingSpeedBonus",
      displayName: "Tracking Speed Bonus",
      unitId: 105,
      unitSymbol: "%",
    },
  ],
  modifiedBy: [modifier({})],
  modifies: [],
  statOf: [{ effectId: 10, effectName: "targetAttack", role: "Tracking" }],
};

function renderPage(props: Partial<PageProps> = {}) {
  const Page =
    require("~/app/dogma/attribute/[attributeId]/page.client").default;
  return render(
    <MantineProvider env="test">
      <Page {...PROPS} {...props} />
    </MantineProvider>,
  );
}

describe("Dogma attribute page (client)", () => {
  beforeEach(() => {
    mockUseEntityTable.mockReset().mockReturnValue({
      isPending: false,
      isError: false,
      data: packTypeRows([
        {
          typeId: 2185,
          name: "Small Focused Pulse Laser I",
          published: true,
          groupId: 53,
          groupName: "Energy Weapon",
          categoryId: 7,
          categoryName: "Module",
          value: 0.5,
        },
        {
          typeId: 3300,
          name: "Gunnery",
          published: true,
          groupId: 255,
          groupName: "Gunnery",
          categoryId: 16,
          categoryName: "Skill",
          value: 0.01,
        },
      ]),
    });
  });

  it("names the attribute and badges what players need to know", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Turret Tracking" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("trackingSpeed").length).toBeGreaterThan(0);
    expect(screen.getByText("Turrets")).toBeInTheDocument();
    expect(screen.getByText("Higher is better")).toBeInTheDocument();
    expect(screen.getByText("Stacking penalised")).toBeInTheDocument();
    expect(screen.getByText("1 effect")).toBeInTheDocument();
  });

  it("leads with our description, with CCP's tooltip and note beside it", () => {
    renderPage();
    const viewers = screen.getAllByTestId("mail-viewer");
    expect(viewers[0]).toHaveTextContent(
      "How fast a turret can follow its target",
    );
    expect(screen.getByText("AI-generated")).toBeInTheDocument();
    expect(screen.getByText("In-game tooltip")).toBeInTheDocument();
    expect(screen.getByText("CCP's note")).toBeInTheDocument();
    expect(viewers).toHaveLength(3);
  });

  it("shows CCP's text alone when we have none", () => {
    renderPage({ customDescription: null, description: null });
    expect(screen.queryByText("AI-generated")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("mail-viewer")).toHaveLength(1);
  });

  it("reads each changing modifier as a sentence", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Changed by" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          element.textContent ===
            "Energy Weapon on the ship›Turret Tracking + Tracking Speed Bonus %",
      ),
    ).toBeInTheDocument();
    // Nothing reads this attribute, so that section is left out.
    expect(
      screen.queryByRole("heading", { name: "Changes" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Used as a stat by effects")).toBeInTheDocument();
    expect(screen.getByText("targetAttack")).toBeInTheDocument();
  });

  it("fetches the item list and shows each item's value", () => {
    renderPage();
    expect(mockUseEntityTable).toHaveBeenCalledWith(
      "/api/dogma/attribute/160/types",
      true,
    );
    expect(screen.getByText(/2 items have this attribute/)).toBeInTheDocument();
    expect(screen.getByText("Small Focused Pulse Laser I")).toBeInTheDocument();
    expect(screen.getAllByText("value:0.5").length).toBeGreaterThan(0);
    // A skill's value is shown as it is: whether it is per level depends on
    // the attribute.
    expect(screen.queryByText("/ level")).not.toBeInTheDocument();
  });

  it("skips the fetch when no item has the attribute", () => {
    renderPage({ itemCount: 0, valueRange: null });
    expect(mockUseEntityTable).toHaveBeenCalledWith(
      "/api/dogma/attribute/160/types",
      false,
    );
    expect(screen.getByText("No item has this attribute.")).toBeInTheDocument();
  });

  it("lists the raw fields, linking related attributes", () => {
    renderPage();
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Turrets (7)")).toBeInTheDocument();
    expect(screen.getByText("radians/second (117)")).toBeInTheDocument();
    expect(screen.getByText("Maximum Tracking")).toBeInTheDocument();
  });

  it("falls back to the attribute id when it has no name", () => {
    renderPage({ name: null, displayName: null });
    expect(
      screen.getByRole("heading", { name: "Attribute 160" }),
    ).toBeInTheDocument();
  });
});

// The server wrapper resolves `params` inside the Suspense boundary, so reach
// its content component the same way React would rather than rendering the
// async function as a client component.
async function resolvePageContent(attributeId: string) {
  const Page = require("~/app/dogma/attribute/[attributeId]/page").default;
  const suspenseEl = Page({ params: Promise.resolve({ attributeId }) });
  const contentEl = suspenseEl.props.children as {
    type: (props: unknown) => Promise<ReactNode>;
    props: unknown;
  };
  return contentEl.type(contentEl.props);
}

// The guard used to be `Number.isFinite`, which let `/dogma/attribute/-1` and
// `/dogma/attribute/04` render a 200 apiece — extra URLs for a page that was
// far too heavy to be crawled twice (attribute 4 measured 29.8 MB before its
// item list moved to an API route).
describe("dogma attribute page id validation", () => {
  it.each(["0", "-1", "04", "4.0", "bad", ""])(
    "404s rather than serving a second URL for %p",
    async (attributeId) => {
      await expect(resolvePageContent(attributeId)).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
    },
  );
});
