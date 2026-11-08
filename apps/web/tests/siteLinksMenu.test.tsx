import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    prefetch,
    children,
    ...rest
  }: {
    href?: string | object;
    prefetch?: boolean;
    children?: ReactNode;
  }) => (
    <a
      {...rest}
      href={typeof href === "string" ? href : ""}
      data-prefetch={String(prefetch)}
    >
      {children}
    </a>
  ),
}));

jest.mock("~/env", () => ({
  env: { NEXT_PUBLIC_DISCORD_INVITE_LINK: "https://discord.gg/jitaspace" },
}));

function renderMenu() {
  const {
    SiteLinksMenu,
  } = require("~/layouts/MainLayout/HeaderMenu/SiteLinksMenu");
  render(
    <MantineProvider>
      <SiteLinksMenu />
    </MantineProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "About JitaSpace" }));
}

// The dropdown is still mid-transition in jsdom, which the accessibility
// queries treat as hidden, so they look past that.

describe("SiteLinksMenu", () => {
  it("lists the site's pages without prefetching them on sight", async () => {
    renderMenu();

    // The header is on every page: see siteLinks for the prefetch cost.
    for (const [label, href] of [
      ["About", "/about"],
      ["Support", "/support"],
      ["Status", "/status"],
    ]) {
      const item = await screen.findByRole("menuitem", {
        name: label,
        hidden: true,
      });
      expect(item).toHaveAttribute("href", href);
      expect(item).toHaveAttribute("data-prefetch", "false");
    }
  });

  it("links the Discord invite in a new tab", async () => {
    renderMenu();

    const discord = await screen.findByRole("menuitem", {
      name: "Discord",
      hidden: true,
    });
    expect(discord).toHaveAttribute("href", "https://discord.gg/jitaspace");
    expect(discord).toHaveAttribute("target", "_blank");
  });
});
