import "@testing-library/jest-dom/jest-globals";

import type { ImgHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUseAuthenticatedCharacterIds = jest.fn<() => number[]>();
const mockUseAuthStore = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useAuthenticatedCharacterIds: () => mockUseAuthenticatedCharacterIds(),
  useAuthStore: (selector: (state: unknown) => unknown) =>
    mockUseAuthStore(selector),
}));

jest.mock("@jitaspace/ui", () => ({
  CharacterAvatar: () => <div>Character Avatar</div>,
}));

// AllianceCard moved to @jitaspace/eve-components.
jest.mock("@jitaspace/eve-components", () => ({
  AllianceCard: ({ allianceId }: { allianceId: number }) => (
    <span>{`Alliance ${allianceId}`}</span>
  ),
}));

jest.mock("~/components/Card", () => ({
  AuthenticatedCharacterCard: ({ characterId }: { characterId: number }) => (
    <div>{`Character ${characterId}`}</div>
  ),
  CorporationCard: ({ corporationId }: { corporationId: number }) => (
    <span>{`Corporation ${corporationId}`}</span>
  ),
}));

jest.mock("~/components/debug", () => ({
  DevelopmentModeAlert: () => null,
}));

jest.mock("~/config/apps", () => ({
  characterApps: {
    app: {
      name: "Character App",
      description: "desc",
      Icon: () => null,
      url: "/",
    },
  },
  universeApps: {
    app: {
      name: "Universe App",
      description: "desc",
      Icon: () => null,
      url: "/",
    },
  },
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

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    <img alt={props.alt} {...props} />
  ),
}));

describe("home page corporations", () => {
  beforeEach(() => {
    mockUseAuthenticatedCharacterIds.mockReset();
    mockUseAuthStore.mockReset();
  });

  it("lists unique corporations for authenticated characters", () => {
    mockUseAuthenticatedCharacterIds.mockReturnValue([100, 101]);
    mockUseAuthStore.mockImplementation((selector) =>
      selector({
        characters: {
          100: { allianceId: 10, corporationId: 1 },
          101: { allianceId: 10, corporationId: 1 },
          102: { corporationId: 2 },
        },
      }),
    );

    const Page = require("~/app/page").default;
    render(
      <MantineProvider>
        <Page />
      </MantineProvider>,
    );

    expect(screen.getByText("Corporations:")).toBeInTheDocument();
    expect(screen.getAllByText("Corporation 1")).toHaveLength(1);
    expect(screen.queryByText("Corporation 2")).not.toBeInTheDocument();

    expect(screen.getByText("Alliances:")).toBeInTheDocument();
    expect(screen.getAllByText("Alliance 10")).toHaveLength(1);
  });

  it("renders no corporation or alliance cards when none are available", () => {
    mockUseAuthenticatedCharacterIds.mockReturnValue([100]);
    mockUseAuthStore.mockImplementation((selector) =>
      selector({
        characters: {
          100: {},
        },
      }),
    );

    const Page = require("~/app/page").default;
    render(
      <MantineProvider>
        <Page />
      </MantineProvider>,
    );

    expect(screen.getByText("Corporations:")).toBeInTheDocument();
    expect(screen.queryByText("Corporation 100")).not.toBeInTheDocument();
    expect(screen.getByText("Alliances:")).toBeInTheDocument();
    expect(screen.queryByText("Alliance 100")).not.toBeInTheDocument();
  });

  it("lists unique alliances for authenticated characters", () => {
    mockUseAuthenticatedCharacterIds.mockReturnValue([100, 101, 102]);
    mockUseAuthStore.mockImplementation((selector) =>
      selector({
        characters: {
          100: { allianceId: 10, corporationId: 1 },
          101: { allianceId: 10, corporationId: 2 },
          102: { allianceId: 20, corporationId: 3 },
          103: { allianceId: 30, corporationId: 4 },
        },
      }),
    );

    const Page = require("~/app/page").default;
    render(
      <MantineProvider>
        <Page />
      </MantineProvider>,
    );

    expect(screen.getAllByText("Alliance 10")).toHaveLength(1);
    expect(screen.getByText("Alliance 20")).toBeInTheDocument();
    expect(screen.queryByText("Alliance 30")).not.toBeInTheDocument();
  });
});
