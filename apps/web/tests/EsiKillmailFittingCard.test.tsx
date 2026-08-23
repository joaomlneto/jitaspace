import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// EsiKillmailFittingCard is a thin mapper: it pulls a killmail from ESI and
// projects victim.items onto <ShipFittingCard>'s items prop. Stub both sides —
// useKillmail for the input, ShipFittingCard for the output — so the assertions
// are about the projection itself and nothing else.
// jest.mock is NOT auto-hoisted here, so the component is lazy-require()d
// inside each test AFTER the mocks are registered.
// ---------------------------------------------------------------------------

const mockUseKillmail = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useKillmail: (...args: unknown[]) => mockUseKillmail(...args),
}));

jest.mock("~/components/Fitting/ShipFittingCard/ShipFittingCard", () => ({
  ShipFittingCard: ({
    items,
  }: {
    items: { typeId: number; flag: string; quantity: number }[];
  }) => (
    <div data-testid="fitting">
      {items.map((item, index) => (
        <span key={index} data-testid={`item-${item.typeId}`}>
          {`${item.flag}:${item.quantity}`}
        </span>
      ))}
    </div>
  ),
}));

interface Item {
  item_type_id: number;
  flag: number;
  quantity_destroyed?: number;
  quantity_dropped?: number;
  singleton: number;
}

const renderWithItems = (items: Item[]) => {
  mockUseKillmail.mockReturnValue({
    data: {
      data: {
        killmail_id: 137867814,
        victim: { ship_type_id: 670, items },
      },
    },
  });

  const {
    EsiKillmailFittingCard,
  } = require("~/components/Fitting/ShipFittingCard/EsiKillmailFittingCard");

  render(
    <MantineProvider>
      <EsiKillmailFittingCard killmailId={137867814} killmailHash="deadbeef" />
    </MantineProvider>,
  );
};

describe("EsiKillmailFittingCard", () => {
  it("sums destroyed and dropped quantities rather than preferring destroyed", () => {
    // Regression: this was written `a ?? 0 + (b ?? 0)`, which parses as
    // `a ?? (0 + (b ?? 0))` because `+` binds tighter than `??`, so a stack
    // reporting both counts yielded only the destroyed one.
    //
    // That never actually misrendered, because ESI sets exactly one of the two
    // per item row — 0 of 228,676 rows in a full day of killmails carried both,
    // and the buggy form is accidentally correct for one-sided rows. The
    // invariant is undocumented and unguaranteed, so this pins the arithmetic
    // rather than the accident.
    renderWithItems([
      {
        item_type_id: 21898,
        flag: 5,
        quantity_destroyed: 3,
        quantity_dropped: 5,
        singleton: 0,
      },
    ]);

    expect(screen.getByTestId("item-21898")).toHaveTextContent("Cargo:8");
  });

  it("treats a missing destroyed or dropped count as zero", () => {
    renderWithItems([
      {
        item_type_id: 488,
        flag: 27,
        quantity_dropped: 7,
        singleton: 0,
      },
      {
        item_type_id: 2048,
        flag: 11,
        quantity_destroyed: 2,
        singleton: 0,
      },
      { item_type_id: 3178, flag: 19, singleton: 0 },
    ]);

    expect(screen.getByTestId("item-488")).toHaveTextContent("HiSlot0:7");
    expect(screen.getByTestId("item-2048")).toHaveTextContent("LoSlot0:2");
    expect(screen.getByTestId("item-3178")).toHaveTextContent("MedSlot0:0");
  });

  it("falls back to Invalid for flags outside the fitting enum", () => {
    // Flag 89 is Implant — a real killmail flag with no member in ESI's
    // fitting-only ItemsFlagEnum, so it cannot be mapped to a slot.
    renderWithItems([
      {
        item_type_id: 33077,
        flag: 89,
        quantity_destroyed: 1,
        singleton: 2,
      },
    ]);

    expect(screen.getByTestId("item-33077")).toHaveTextContent("Invalid:1");
  });

  it("renders no items while the killmail is still loading", () => {
    mockUseKillmail.mockReturnValue({ data: undefined });

    const {
      EsiKillmailFittingCard,
    } = require("~/components/Fitting/ShipFittingCard/EsiKillmailFittingCard");

    render(
      <MantineProvider>
        <EsiKillmailFittingCard killmailId={137867814} killmailHash="deadbeef" />
      </MantineProvider>,
    );

    expect(screen.getByTestId("fitting")).toBeEmptyDOMElement();
  });
});
