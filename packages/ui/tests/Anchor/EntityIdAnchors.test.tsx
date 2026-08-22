import "@testing-library/jest-dom/jest-globals";

import type { ComponentType, ReactElement } from "react";
import { createElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import { BloodlineAnchor } from "../../Anchor/BloodlineAnchor";
import { CorporationAnchor } from "../../Anchor/CorporationAnchor";
import { RaceAnchor } from "../../Anchor/RaceAnchor";

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
