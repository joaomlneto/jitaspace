import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import type { ContractSummary } from "~/components/Contracts/contract";
import type * as CardModule from "~/components/Contracts/ContractCard";
import type * as PartsModule from "~/components/Contracts/ContractParts";
import type * as RowModule from "~/components/Contracts/ContractRow";

// The contract icons render as tagged images, so a test can tell which one
// (and how many) a view drew. Every other EVE icon renders nothing.
jest.mock("@jitaspace/eve-icons", () => {
  const React = require("react");
  const icon =
    (name: string) =>
    ({ alt }: { alt?: string }) =>
      React.createElement("img", { "data-icon": name, alt });
  const icons: Record<string, unknown> = {
    ContractAuctionIcon: icon("auction"),
    ContractCourierIcon: icon("courier"),
    ContractItemExchangeIcon: icon("item-exchange"),
    ContractsIcon: icon("contracts"),
  };
  return new Proxy(icons, {
    get: (target, key: string) => target[key] ?? (() => null),
  });
});
// The presentational components are not under test: render their children.
jest.mock("@jitaspace/ui", () => {
  const React = require("react");
  const passThrough = ({ children }: { children?: ReactNode }) =>
    children == null
      ? null
      : React.createElement(React.Fragment, null, children);
  return new Proxy({}, { get: () => passThrough });
});
// TypeAvatar draws its fallback, as the real one does once the image fails;
// the names render their children, or nothing.
jest.mock("@jitaspace/eve-components", () => {
  const React = require("react");
  const passThrough = ({ children }: { children?: ReactNode }) =>
    children == null
      ? null
      : React.createElement(React.Fragment, null, children);
  const TypeAvatar = ({
    typeId,
    variation,
    fallback,
  }: {
    typeId: number;
    variation?: string;
    fallback?: ReactNode;
  }) =>
    React.createElement(
      "span",
      {
        "data-testid": "type-avatar",
        "data-type-id": typeId,
        "data-variation": variation ?? "",
      },
      fallback,
    );
  return new Proxy(
    { TypeAvatar },
    {
      get: (target: Record<string, unknown>, key: string) =>
        target[key] ?? passThrough,
    },
  );
});

const { ContractArtwork } =
  require("~/components/Contracts/ContractParts") as typeof PartsModule;
const { ContractRow } =
  require("~/components/Contracts/ContractRow") as typeof RowModule;
const { ContractCard } =
  require("~/components/Contracts/ContractCard") as typeof CardModule;

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const iconsIn = (container: HTMLElement) =>
  [...container.querySelectorAll("img[data-icon]")].map((img) =>
    img.getAttribute("data-icon"),
  );

function contract(overrides: Partial<ContractSummary> = {}): ContractSummary {
  return {
    contractId: 1,
    type: "item_exchange",
    title: "",
    issuerId: 90000001,
    issuerName: "Issuer",
    issuerCorporationId: 98000001,
    issuerCorporationName: "Corp",
    forCorporation: false,
    dateIssued: "2026-11-01T00:00:00.000Z",
    dateExpired: "2026-11-30T00:00:00.000Z",
    daysToComplete: null,
    volume: null,
    price: 1_000_000,
    reward: null,
    collateral: null,
    buyout: null,
    start: null,
    end: null,
    regionId: 10000002,
    regionName: "The Forge",
    items: { count: 1, first: { typeId: 587, name: "Rifter", quantity: 1 } },
    ...overrides,
  };
}

describe("ContractArtwork", () => {
  it("draws the contract type's icon when there is no item", () => {
    const { container } = renderWithMantine(
      <ContractArtwork type="courier" item={null} size={28} />,
    );
    expect(iconsIn(container)).toEqual(["courier"]);
    expect(screen.queryByTestId("type-avatar")).toBeNull();
  });

  it("draws the item, falling back to the type's icon if it has no image", () => {
    const { container } = renderWithMantine(
      <ContractArtwork
        type="auction"
        item={{ typeId: 691, imageVariation: "bpc" }}
        size={40}
      />,
    );
    const avatar = screen.getByTestId("type-avatar");
    expect(avatar).toHaveAttribute("data-type-id", "691");
    expect(avatar).toHaveAttribute("data-variation", "bpc");
    // The fallback is the auction icon, inside the avatar.
    expect(iconsIn(avatar)).toEqual(["auction"]);
    expect(iconsIn(container)).toEqual(["auction"]);
  });
});

describe("ContractRow", () => {
  it("shows a courier's icon once, in the image slot", () => {
    const { container } = renderWithMantine(
      <ContractRow
        contract={contract({
          type: "courier",
          items: { count: 0, first: null },
          price: null,
          reward: 5_000_000,
        })}
      />,
    );
    expect(screen.queryByTestId("type-avatar")).toBeNull();
    expect(iconsIn(container)).toEqual(["courier"]);
  });

  it("keeps the small type icon beside an item's image", () => {
    const { container } = renderWithMantine(
      <ContractRow contract={contract()} />,
    );
    expect(screen.getByTestId("type-avatar")).toBeInTheDocument();
    // The type icon, then the fallback inside the item's avatar.
    expect(iconsIn(container)).toEqual(["item-exchange", "item-exchange"]);
  });
});

describe("ContractCard", () => {
  it("shows the type's icon for a contract with no item", () => {
    renderWithMantine(
      <ContractCard
        contract={contract({
          title: "Wanted",
          items: { count: 0, first: null },
        })}
      />,
    );
    expect(screen.queryByTestId("type-avatar")).toBeNull();
    expect(screen.getAllByRole("img", { name: "Item Exchange" }).length).toBe(
      2,
    );
  });
});
