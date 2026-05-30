import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// next/navigation — the page client receives props directly; mock defensively.
// ---------------------------------------------------------------------------
jest.mock("next/navigation", () => ({
  useParams: () => ({ effectId: "30" }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------
const mockUseDogmaEffect = jest.fn();
jest.mock("@jitaspace/hooks", () => ({
  useDogmaEffect: (...args: unknown[]) => mockUseDogmaEffect(...args),
}));

jest.mock("@jitaspace/tiptap-eve", () => ({
  sanitizeFormattedEveString: (s: string) => s,
}));

// Stub every @jitaspace/ui export to render nothing (hoist-safe Proxy).
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

jest.mock("~/components/Text", () => ({
  DogmaAttributeName: () => null,
  DogmaEffectName: () => null,
}));

jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content?: string }) => (
    <div data-testid="mail-viewer">{content}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Sample data: rich effect so every effect?.data.* conditional renders.
// ---------------------------------------------------------------------------
const FULL_EFFECT = {
  effect_category: 4,
  name: "shieldBoosting",
  display_name: "Shield Boosting",
  discharge_attribute_id: 1,
  duration_attribute_id: 2,
  falloff_attribute_id: 3,
  range_attribute_id: 4,
  tracking_speed_attribute_id: 5,
  disallow_auto_repeat: true,
  electronic_chance: false,
  is_assistance: true,
  is_offensive: false,
  is_warp_safe: true,
  range_chance: false,
  icon_id: 1234,
  pre_expression: 100,
  post_expression: 200,
};

const FULL_MODIFIERS = [
  {
    modifierIndex: 0,
    domain: "shipID",
    targetEffectId: 99,
    func: "ItemModifier",
    modifiedAttributeId: 11,
    modifyingAttributeId: 12,
    operator: 6,
    groupId: 40,
    skillTypeId: 3300,
    isDeleted: false,
  },
  {
    // Minimal modifier: all optional ids falsy so those branches are skipped.
    modifierIndex: 1,
    domain: null,
    targetEffectId: null,
    func: "LocationModifier",
    modifiedAttributeId: null,
    modifyingAttributeId: null,
    operator: null,
    groupId: null,
    skillTypeId: null,
    isDeleted: false,
  },
];

const FULL_TYPES = [
  { typeId: 587, name: "Rifter", isDefault: true, groupId: 25 },
  { typeId: 588, name: "Breacher", isDefault: false, groupId: 25 },
  { typeId: 621, name: "Caracal", isDefault: true, groupId: 26 },
];

const FULL_GROUPS = [
  { groupId: 26, name: "Cruiser" },
  { groupId: 25, name: "Frigate" },
];

function renderPage(props: Record<string, unknown> = {}) {
  const Page = require("~/app/dogma/effect/[effectId]/page.client").default;
  const defaults = {
    effectId: 30,
    name: "Shield Boosting",
    description: "Boosts shields.",
    published: true,
    types: FULL_TYPES,
    modifiers: FULL_MODIFIERS,
    groups: FULL_GROUPS,
  };
  return render(
    <MantineProvider>
      <Page {...defaults} {...props} />
    </MantineProvider>,
  );
}

describe("Dogma effect page (client)", () => {
  beforeEach(() => {
    mockUseDogmaEffect.mockReset();
    mockUseDogmaEffect.mockReturnValue({ data: { data: FULL_EFFECT } });
  });

  it("renders every section/field with full data present", () => {
    renderPage();

    // Title + description viewer ("Shield Boosting" appears both as the title
    // and as the effect display name row).
    expect(
      screen.getAllByText("Shield Boosting").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("mail-viewer")).toHaveTextContent(
      "Boosts shields.",
    );

    // Core fields
    expect(screen.getByText("Effect ID")).toBeInTheDocument();
    expect(screen.getByText("Effect Category ID")).toBeInTheDocument();
    expect(screen.getByText("Display Name")).toBeInTheDocument();

    // All attribute-id gated rows
    expect(screen.getByText("Discharge Attribute")).toBeInTheDocument();
    expect(screen.getByText("Duration Attribute")).toBeInTheDocument();
    expect(screen.getByText("Falloff Attribute")).toBeInTheDocument();
    expect(screen.getByText("Range Attribute")).toBeInTheDocument();
    expect(screen.getByText("Tracking Speed Attribute")).toBeInTheDocument();

    // Boolean-ish rows
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Disallow Auto Repeat")).toBeInTheDocument();
    expect(screen.getByText("Electronic Chance")).toBeInTheDocument();
    expect(screen.getByText("Is Assistance")).toBeInTheDocument();
    expect(screen.getByText("Is Offensive")).toBeInTheDocument();
    expect(screen.getByText("Is Warp Safe")).toBeInTheDocument();
    expect(screen.getByText("Range Chance")).toBeInTheDocument();
    expect(screen.getByText("Icon ID")).toBeInTheDocument();
    expect(screen.getByText("Pre Expression")).toBeInTheDocument();
    expect(screen.getByText("Post Expression")).toBeInTheDocument();

    // Modifiers section (rich modifier renders its gated rows)
    expect(screen.getByText("Modifiers")).toBeInTheDocument();
    expect(screen.getByText("Effect Group ID")).toBeInTheDocument();
    expect(screen.getByText("Modifying Attribute")).toBeInTheDocument();
    expect(screen.getByText("Modified Attribute")).toBeInTheDocument();
    expect(screen.getByText("Target Effect")).toBeInTheDocument();
    expect(screen.getByText("Skill")).toBeInTheDocument();
    expect(screen.getAllByText("Domain").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Function").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Operator").length).toBeGreaterThanOrEqual(1);

    // Types grouped by sorted group name
    expect(screen.getByText("Types")).toBeInTheDocument();
    expect(screen.getByText("Cruiser")).toBeInTheDocument();
    expect(screen.getByText("Frigate")).toBeInTheDocument();
    // isDefault badge
    expect(screen.getAllByText("IS DEFAULT").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the opposite Yes/No arms when the boolean flags are flipped", () => {
    mockUseDogmaEffect.mockReturnValue({
      data: {
        data: {
          ...FULL_EFFECT,
          disallow_auto_repeat: false,
          electronic_chance: true,
          is_assistance: false,
          is_offensive: true,
          is_warp_safe: false,
          range_chance: true,
        },
      },
    });

    renderPage({ published: false });

    // Both Yes and No values are now present across the boolean rows.
    expect(screen.getAllByText("Yes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("No").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Disallow Auto Repeat")).toBeInTheDocument();
    expect(screen.getByText("Range Chance")).toBeInTheDocument();
  });

  it("renders the unnamed/no-description fallbacks and Published No", () => {
    // Effect hook returns no data so every effect?.data.* row is skipped.
    mockUseDogmaEffect.mockReturnValue({ data: undefined });

    renderPage({
      name: null,
      description: null,
      published: false,
      types: [],
      modifiers: [],
      groups: [],
    });

    // Unnamed effect title italic
    expect(screen.getByText("Unnamed Effect")).toBeInTheDocument();
    // No description fallback string passed into the viewer
    expect(screen.getByTestId("mail-viewer")).toHaveTextContent(
      "No description provided",
    );

    // Published "No"
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();

    // Optional effect rows absent
    expect(screen.queryByText("Effect Category ID")).not.toBeInTheDocument();
    expect(screen.queryByText("Display Name")).not.toBeInTheDocument();
    expect(screen.queryByText("Discharge Attribute")).not.toBeInTheDocument();

    // Sections still present
    expect(screen.getByText("Modifiers")).toBeInTheDocument();
    expect(screen.getByText("Types")).toBeInTheDocument();
  });

  it("handles undefined groups/modifiers without crashing", () => {
    mockUseDogmaEffect.mockReturnValue({ data: { data: { name: "x" } } });
    renderPage({
      types: [],
      modifiers: [],
      groups: undefined,
    });
    expect(screen.getByText("Types")).toBeInTheDocument();
  });
});
