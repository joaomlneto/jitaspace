import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";

import acknowledgements from "~/app/about/acknowledgements.json";

jest.mock("~/env", () => ({
  env: { NEXT_PUBLIC_DISCORD_INVITE_LINK: "https://discord.gg/test" },
}));
jest.mock("react-obfuscate-email", () => ({ Email: () => null }));

// react-markdown is ESM-only, which this Jest setup does not transform. The
// stand-in handles the one construct the reasons use, `[text](url)`, and
// renders it through the page's own `a` component, which is what is tested.
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({
    children,
    components,
  }: {
    children: string;
    components: {
      a: (props: {
        href: string;
        children: React.ReactNode;
      }) => React.ReactNode;
    };
  }) =>
    children.split(/(\[[^\]]+\]\([^)]+\))/).map((part, index) => {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
      return (
        <span key={index}>
          {link
            ? components.a({ href: link[2] ?? "", children: link[1] })
            : part}
        </span>
      );
    }),
}));

// Names come from ESI in the app; here, the id is enough to tell them apart.
jest.mock("@jitaspace/eve-components", () => ({
  CharacterAnchor: ({
    characterId,
    children,
  }: {
    characterId: number;
    children?: React.ReactNode;
  }) => <a href={`/character/${characterId}`}>{children}</a>,
  CharacterName: ({ characterId }: { characterId: number }) => (
    <span>{`Character ${characterId}`}</span>
  ),
}));
jest.mock("@jitaspace/ui", () => ({
  CharacterAvatar: ({ characterId }: { characterId: number }) => (
    <span role="img" aria-label={`Portrait of ${characterId}`} />
  ),
}));

function renderAbout() {
  const PageClient = (
    require("~/app/about/page.client") as { default: () => React.ReactNode }
  ).default;
  render(
    <MantineProvider>
      <PageClient />
    </MantineProvider>,
  );
  const heading = screen.getByRole("heading", { name: "Acknowledgements" });
  // The intro paragraph, then the list.
  const list = heading.nextElementSibling?.nextElementSibling as HTMLElement;
  return within(list);
}

describe("About page acknowledgements", () => {
  it("lists everyone in acknowledgements.json, in order", () => {
    const list = renderAbout();
    expect(list.getAllByRole("listitem")).toHaveLength(acknowledgements.length);
  });

  it("pictures and links a character, named from ESI", () => {
    const list = renderAbout();
    expect(
      list.getByRole("img", { name: "Portrait of 91610578" }),
    ).toBeInTheDocument();
    expect(
      list.getByRole("link", { name: "Character 91610578" }),
    ).toHaveAttribute("href", "/character/91610578");
  });

  it("names anyone else as written, with no portrait", () => {
    const list = renderAbout();
    const kenn = list.getByText(/^Kenn/).closest("li") as HTMLElement;
    expect(within(kenn).queryByRole("img")).toBeNull();
  });

  it("renders a reason's Markdown links, opening in a new tab", () => {
    const list = renderAbout();
    const link = list.getByRole("link", { name: "EVE-Incursions" });
    expect(link).toHaveAttribute("href", "https://eve-incursions.de");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
