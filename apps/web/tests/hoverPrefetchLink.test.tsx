import "@testing-library/jest-dom/jest-globals";

import type { FocusEventHandler, MouseEventHandler, ReactNode } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    prefetch,
    children,
    onMouseEnter,
    onTouchStart,
    onFocus,
  }: {
    href?: string | object;
    prefetch?: boolean | null;
    children?: ReactNode;
    onMouseEnter?: MouseEventHandler<HTMLAnchorElement>;
    onTouchStart?: React.TouchEventHandler<HTMLAnchorElement>;
    onFocus?: FocusEventHandler<HTMLAnchorElement>;
  }) => (
    <a
      href={typeof href === "string" ? href : ""}
      data-prefetch={String(prefetch)}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
      onFocus={onFocus}
    >
      {children}
    </a>
  ),
}));

describe("HoverPrefetchLink", () => {
  const renderLink = (
    props: { onMouseEnter?: () => void; prefetch?: boolean } = {},
  ) => {
    const {
      HoverPrefetchLink,
    } = require("~/components/Link/HoverPrefetchLink");
    render(
      <HoverPrefetchLink href="/market" {...props}>
        Market
      </HoverPrefetchLink>,
    );
    return screen.getByRole("link", { name: "Market" });
  };

  it("does not prefetch until the visitor shows intent", () => {
    // `false` is what keeps a layout link from being fetched on every page view.
    expect(renderLink()).toHaveAttribute("data-prefetch", "false");
  });

  it.each([
    ["hover", fireEvent.mouseEnter],
    ["touch", fireEvent.touchStart],
    ["keyboard focus", fireEvent.focus],
  ])("falls back to Next's default prefetch on %s", (_name, fire) => {
    const link = renderLink();

    fire(link);

    // `null` hands the decision back to Next, which prefetches from then on.
    expect(link).toHaveAttribute("data-prefetch", "null");
  });

  it("still calls the caller's own handlers", () => {
    const onMouseEnter = jest.fn();
    const link = renderLink({ onMouseEnter });

    fireEvent.mouseEnter(link);

    expect(onMouseEnter).toHaveBeenCalledTimes(1);
  });

  it("lets the caller pin prefetching on or off regardless of intent", () => {
    const off = renderLink({ prefetch: false });
    fireEvent.mouseEnter(off);
    expect(off).toHaveAttribute("data-prefetch", "false");
  });

  it("lets the caller force prefetching on sight", () => {
    expect(renderLink({ prefetch: true })).toHaveAttribute(
      "data-prefetch",
      "true",
    );
  });
});

// The menus' "Character Page" / "Corporation Page" items link through these.
describe.each([
  ["CharacterPageLink", { characterId: 123 }, "/character/123"],
  ["CorporationPageLink", { corporationId: 456 }, "/corporation/456"],
])("%s", (name, props, href) => {
  it("links to the entity page and prefetches it only on intent", () => {
    const Component = (
      require("~/components/Link") as Record<
        string,
        (p: Record<string, unknown>) => ReactNode
      >
    )[name]!;
    render(<Component {...props}>Page</Component>);
    const link = screen.getByRole("link", { name: "Page" });

    expect(link).toHaveAttribute("href", href);
    expect(link).toHaveAttribute("data-prefetch", "false");
    fireEvent.mouseEnter(link);
    expect(link).toHaveAttribute("data-prefetch", "null");
  });
});
