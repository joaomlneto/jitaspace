import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { DEFAULT_THEME, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import type { EveIconProps } from "@jitaspace/eve-icons";

jest.mock("~/components/Card/SectionLinkCard.module.css", () => ({
  card: "section-card",
  title: "section-title",
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: {
    href?: string | object;
    children?: ReactNode;
  }) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  ),
}));

const Icon = ({ width, height }: EveIconProps) => (
  <svg data-testid="section-icon" width={width} height={height} />
);

function renderCard(colorScheme: "light" | "dark") {
  const { SectionLinkCard } = require("~/components/Card/SectionLinkCard");
  return render(
    <MantineProvider forceColorScheme={colorScheme}>
      <SectionLinkCard
        href="/contacts/character"
        Icon={Icon}
        title="Character Contacts"
        description="View your character's contacts."
      />
    </MantineProvider>,
  );
}

describe("SectionLinkCard", () => {
  it("links the whole card to its section", () => {
    renderCard("dark");
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/contacts/character");
    expect(link).toHaveTextContent("Character Contacts");
    expect(link).toHaveTextContent("View your character's contacts.");
    expect(screen.getByTestId("section-icon")).toHaveAttribute("width", "64");
  });

  it("applies the hover and title-accent classes from the CSS module", () => {
    renderCard("dark");
    expect(screen.getByText("Character Contacts")).toHaveClass("section-title");
    expect(
      screen.getByRole("link").querySelector(".section-card"),
    ).not.toBeNull();
  });

  it.each([
    ["dark", DEFAULT_THEME.colors.dark[5]],
    ["light", DEFAULT_THEME.colors.gray[1]],
  ] as const)("borders the card for the %s color scheme", (scheme, color) => {
    renderCard(scheme);
    const card = screen.getByRole("link").querySelector(".section-card");
    expect(card?.getAttribute("style")).toContain(color);
  });
});
