import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    prefetch,
    children,
  }: {
    href?: string | object;
    prefetch?: boolean;
    children?: ReactNode;
  }) => (
    <a
      href={typeof href === "string" ? href : ""}
      data-prefetch={String(prefetch)}
    >
      {children}
    </a>
  ),
}));

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("MobileTabBar", () => {
  it("does not prefetch its links on sight", () => {
    const { MobileTabBar } = require("~/layouts/MainLayout/MobileTabBar");

    render(
      <MantineProvider>
        <MobileTabBar />
      </MantineProvider>,
    );

    // The bar is in the DOM on every page and viewport, so a prefetching link
    // here is fetched on every single page view — four PPR segment requests
    // per link, ~16 extra requests per view. Keep it off.
    for (const [label, href] of [
      ["Home", "/"],
      ["Search", "/search"],
      ["Market", "/market"],
      ["Map", "/regions"],
    ]) {
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("data-prefetch", "false");
    }
  });
});
