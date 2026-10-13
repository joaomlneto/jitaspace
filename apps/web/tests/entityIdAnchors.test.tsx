import "@testing-library/jest-dom/jest-globals";

import type { ComponentType, ReactElement } from "react";
import { createElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import { AllianceAnchor } from "~/components/Anchor/AllianceAnchor";
import { BloodlineAnchor } from "~/components/Anchor/BloodlineAnchor";
import { CategoryAnchor } from "~/components/Anchor/CategoryAnchor";
import { CorporationAnchor } from "~/components/Anchor/CorporationAnchor";
import { DogmaAttributeAnchor } from "~/components/Anchor/DogmaAttributeAnchor";
import { DogmaEffectAnchor } from "~/components/Anchor/DogmaEffectAnchor";
import { DungeonAnchor } from "~/components/Anchor/DungeonAnchor";
import { EpicArcAnchor } from "~/components/Anchor/EpicArcAnchor";
import { GroupAnchor } from "~/components/Anchor/GroupAnchor";
import { MarketGroupAnchor } from "~/components/Anchor/MarketGroupAnchor";
import { MissionAnchor } from "~/components/Anchor/MissionAnchor";
import { RaceAnchor } from "~/components/Anchor/RaceAnchor";
import { StarAnchor } from "~/components/Anchor/StarAnchor";
import { TypeListAnchor } from "~/components/Anchor/TypeListAnchor";
import { WarAnchor } from "~/components/Anchor/WarAnchor";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

/**
 * These anchors take an entity id that callers read off a query result which
 * has not resolved on first render. Interpolating that straight into an href
 * produced paths like `/race/undefined`, which `next/link` then eagerly
 * prefetched — ~99k requests/day in production. Each must therefore render its
 * children unlinked until the id actually exists.
 */
const anchors = [
  {
    name: "RaceAnchor",
    path: "/race",
    Component: RaceAnchor,
    idProp: "raceId",
  },
  {
    name: "BloodlineAnchor",
    path: "/bloodline",
    Component: BloodlineAnchor,
    idProp: "bloodlineId",
  },
  {
    name: "CorporationAnchor",
    path: "/corporation",
    Component: CorporationAnchor,
    idProp: "corporationId",
  },
  {
    name: "AllianceAnchor",
    path: "/alliance",
    Component: AllianceAnchor,
    idProp: "allianceId",
  },
  {
    name: "StarAnchor",
    path: "/star",
    Component: StarAnchor,
    idProp: "starId",
  },
  { name: "WarAnchor", path: "/war", Component: WarAnchor, idProp: "warId" },
  {
    name: "DogmaEffectAnchor",
    path: "/dogma/effect",
    Component: DogmaEffectAnchor,
    idProp: "effectId",
  },
  {
    name: "DogmaAttributeAnchor",
    path: "/dogma/attribute",
    Component: DogmaAttributeAnchor,
    idProp: "attributeId",
  },
] as const;

describe.each(anchors)("$name", ({ path, Component, idProp }) => {
  const renderAnchor = (
    id: string | number | null | undefined,
    extra: Record<string, unknown> = {},
  ) =>
    renderWithMantine(
      createElement(
        Component as ComponentType<Record<string, unknown>>,
        { [idProp]: id, ...extra },
        "Label",
      ),
    );

  const anchorEl = () => screen.getByText("Label").closest("a");

  it("links to the entity page once the id is known", () => {
    renderAnchor(42);
    expect(anchorEl()).toHaveAttribute("href", `${path}/42`);
  });

  it("accepts a string id", () => {
    renderAnchor("42");
    expect(anchorEl()).toHaveAttribute("href", `${path}/42`);
  });

  it("renders no trailing slash", () => {
    // Two spellings of the same page would be two CDN cache entries.
    renderAnchor(42);
    expect(anchorEl()?.getAttribute("href")).not.toMatch(/\/$/);
  });

  it("still links when the id is 0", () => {
    // Guarding with `id && …` would silently drop this link. Only a nullish id
    // means "not loaded yet".
    renderAnchor(0);
    expect(anchorEl()).toHaveAttribute("href", `${path}/0`);
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
  ])("renders its children unlinked while the id is %s", (_label, id) => {
    renderAnchor(id);

    // The label survives, so a row keeps its layout and does not shift once
    // the id arrives...
    expect(screen.getByText("Label")).toBeInTheDocument();
    // ...but it must carry no destination at all.
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(anchorEl()).not.toHaveAttribute("href");
  });

  it("never emits an href containing 'undefined'", () => {
    renderAnchor(undefined);
    const hrefs = Array.from(document.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs.some((href) => href?.includes("undefined"))).toBe(false);
  });

  it("keeps the next/link prefetch prop out of the DOM when unlinked", () => {
    // `prefetch` is destructured off before the unlinked branch spreads the
    // rest onto a plain Mantine Anchor, so it can never reach the element.
    renderAnchor(undefined, { prefetch: true });
    expect(anchorEl()).not.toHaveAttribute("prefetch");
  });

  it("forwards Mantine anchor props in both states", () => {
    const { unmount } = renderAnchor(42, { c: "dimmed", underline: "never" });
    expect(anchorEl()).toHaveAttribute("data-underline", "never");
    unmount();

    renderAnchor(undefined, { c: "dimmed", underline: "never" });
    expect(anchorEl()).toHaveAttribute("data-underline", "never");
  });
});

/**
 * These anchors render their bare children, with no <a> at all, while the id
 * is nullish. `null` must count as "not loaded" as well as `undefined`, or the
 * href reads `/category/null`.
 */
const bareAnchors = [
  {
    name: "CategoryAnchor",
    path: "/category",
    Component: CategoryAnchor,
    idProp: "categoryId",
  },
  {
    name: "GroupAnchor",
    path: "/group",
    Component: GroupAnchor,
    idProp: "groupId",
  },
  {
    name: "MarketGroupAnchor",
    path: "/market-group",
    Component: MarketGroupAnchor,
    idProp: "marketGroupId",
  },
  {
    name: "DungeonAnchor",
    path: "/dungeon",
    Component: DungeonAnchor,
    idProp: "dungeonId",
  },
  {
    name: "EpicArcAnchor",
    path: "/epic-arc",
    Component: EpicArcAnchor,
    idProp: "epicArcId",
  },
  {
    name: "MissionAnchor",
    path: "/mission",
    Component: MissionAnchor,
    idProp: "missionId",
  },
  {
    name: "TypeListAnchor",
    path: "/type-list",
    Component: TypeListAnchor,
    idProp: "typeListId",
  },
] as const;

describe.each(bareAnchors)("$name", ({ path, Component, idProp }) => {
  const renderAnchor = (id: string | number | null | undefined) =>
    renderWithMantine(
      createElement(
        Component as ComponentType<Record<string, unknown>>,
        { [idProp]: id },
        "Label",
      ),
    );

  it.each([
    ["42", 42],
    ["a string id", "42"],
  ])("links to the entity page for %s", (_label, id) => {
    renderAnchor(id);
    expect(screen.getByText("Label").closest("a")).toHaveAttribute(
      "href",
      `${path}/42`,
    );
  });

  it("still links when the id is 0", () => {
    renderAnchor(0);
    expect(screen.getByText("Label").closest("a")).toHaveAttribute(
      "href",
      `${path}/0`,
    );
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
  ])("renders its bare children while the id is %s", (_label, id) => {
    renderAnchor(id);
    expect(screen.getByText("Label")).toBeInTheDocument();
    expect(document.querySelector("a")).toBeNull();
  });
});
