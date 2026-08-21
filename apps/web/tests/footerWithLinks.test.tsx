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

jest.mock("~/env", () => ({
  env: { NEXT_PUBLIC_DISCORD_INVITE_LINK: "https://discord.gg/jitaspace" },
}));

jest.mock("~/components/Badge", () => ({
  PartnerBadge: () => null,
}));

describe("FooterWithLinks", () => {
  it("renders the footer links with prefetching disabled", () => {
    const { FooterWithLinks } = require("~/layouts/MainLayout/FooterWithLinks");

    render(
      <MantineProvider>
        <FooterWithLinks />
      </MantineProvider>,
    );

    // The footer is on every page, so prefetching these would fetch /about,
    // /support and /status on every single page view — four PPR segment
    // requests each, ~400k requests/day in production. Almost nobody
    // navigates here, so the prefetch must stay off.
    for (const [label, href] of [
      ["About", "/about"],
      ["Support", "/support"],
      ["Status", "/status"],
    ]) {
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("data-prefetch", "false");
    }
  });
});
