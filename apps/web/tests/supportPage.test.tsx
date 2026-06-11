import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// The Support page renders Mantine UI plus a few data-fetching @jitaspace/ui
// entity wrappers, and reads the Discord invite from ~/env. Stub the wrappers
// as passthroughs and mock env / next/link so the page renders fully without a
// QueryClient or ESI. (jest.mock is not hoisted under this SWC transform, so
// the modules under test are lazy-required after the mocks are registered.)
// ---------------------------------------------------------------------------

jest.mock("~/env", () => ({
  env: { NEXT_PUBLIC_DISCORD_INVITE_LINK: "https://discord.gg/jitaspace-test" },
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href?: string | object;
    children?: ReactNode;
  }) => <a href={typeof href === "string" ? href : ""}>{children}</a>,
}));

jest.mock("@jitaspace/ui", () => ({
  CharacterAvatar: ({ characterId }: { characterId?: number }) => (
    <span>{`char-avatar-${characterId ?? ""}`}</span>
  ),
  CharacterName: ({ characterId }: { characterId?: number }) => (
    <span>{`Character ${characterId ?? ""}`}</span>
  ),
  CharacterAnchor: ({
    characterId,
    children,
  }: {
    characterId?: number;
    children?: ReactNode;
  }) => <a href={`/character/${characterId}`}>{children}</a>,
  CorporationAvatar: ({ corporationId }: { corporationId?: number }) => (
    <span>{`corp-avatar-${corporationId ?? ""}`}</span>
  ),
  CorporationName: ({ corporationId }: { corporationId?: number }) => (
    <span>{`Corporation ${corporationId ?? ""}`}</span>
  ),
  CorporationAnchor: ({
    corporationId,
    children,
  }: {
    corporationId?: number;
    children?: ReactNode;
  }) => <a href={`/corporation/${corporationId}`}>{children}</a>,
}));

jest.mock("~/components/Badge", () => ({
  PartnerBadge: () => <div>PartnerBadge</div>,
}));

function renderSupportPage() {
  const SupportPage = require("~/app/support/page").default;
  return render(
    <MantineProvider>
      <SupportPage />
    </MantineProvider>,
  );
}

function renderFooter() {
  const { FooterWithLinks } = require("~/layouts/MainLayout/FooterWithLinks");
  return render(
    <MantineProvider>
      <FooterWithLinks />
    </MantineProvider>,
  );
}

describe("Support page", () => {
  it("exports a Support title in its metadata", () => {
    const { metadata } = require("~/app/support/page");
    expect(metadata.title).toBe("Support");
  });

  it("renders every section heading", () => {
    renderSupportPage();
    expect(
      screen.getByRole("heading", { name: "Support JitaSpace" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Free ways to help")).toBeInTheDocument();
    expect(screen.getByText("Buy PLEX, Omega & game time")).toBeInTheDocument();
    expect(screen.getByText("Sponsor development")).toBeInTheDocument();
    expect(screen.getByText("Send ISK in-game")).toBeInTheDocument();
    expect(
      screen.getByText("Disclosures & the fine print"),
    ).toBeInTheDocument();
  });

  it("wires up the free-to-help actions", () => {
    renderSupportPage();
    expect(
      screen.getByRole("link", { name: /Join the Discord/ }),
    ).toHaveAttribute("href", "https://discord.gg/jitaspace-test");
    expect(screen.getByRole("link", { name: /Give feedback/ })).toHaveAttribute(
      "href",
      "https://github.com/joaomlneto/jitaspace/issues/new/choose",
    );
    expect(
      screen.getByRole("link", { name: /Star on GitHub/ }),
    ).toHaveAttribute("href", "https://github.com/joaomlneto/jitaspace");
  });

  it("marks the affiliate shop links as sponsored", () => {
    renderSupportPage();
    const eve = screen.getByRole("link", { name: "Open the EVE Store" });
    expect(eve).toHaveAttribute("href", "https://store.eveonline.com/");
    expect(eve).toHaveAttribute("rel", "sponsored noopener noreferrer");

    const markee = screen.getByRole("link", { name: "Open Markee Dragon" });
    expect(markee).toHaveAttribute(
      "href",
      "https://store.markeedragon.com/affiliate.php?id=1213",
    );
    expect(markee).toHaveAttribute("rel", "sponsored noopener noreferrer");

    // creator code is shown, and the disclosure is present
    expect(screen.getAllByText("JITA").length).toBeGreaterThan(0);
    expect(screen.getByText(/Affiliate disclosure:/)).toBeInTheDocument();
  });

  it("wires up the sponsorship and tip links", () => {
    renderSupportPage();
    expect(
      screen.getByRole("link", { name: /Become a sponsor/ }),
    ).toHaveAttribute("href", "https://github.com/sponsors/joaomlneto");
    expect(
      screen.getByRole("link", { name: /Buy me a coffee/ }),
    ).toHaveAttribute("href", "https://buymeacoffee.com/joaomlneto");
  });

  it("points ISK donations at the corporation and character pages", () => {
    renderSupportPage();
    expect(
      screen.getByRole("link", { name: /Corporation 98832245/ }),
    ).toHaveAttribute("href", "/corporation/98832245");
    expect(
      screen.getByRole("link", { name: /Character 401563624/ }),
    ).toHaveAttribute("href", "/character/401563624");
  });
});

describe("Footer", () => {
  it("links to the Support page", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "Support" })).toHaveAttribute(
      "href",
      "/support",
    );
  });
});
