import "@testing-library/jest-dom/jest-globals";

import type React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// UserButton shows the selected character and a switcher. When a character's
// session has expired (EVE can no longer refresh its token) it must NOT be
// removed — it stays listed and is flagged visually ("Session expired" on the
// header, "expired" in the switcher) with a "Sign in again" affordance that
// opens the login flow. We stub Mantine as passthroughs so the (normally
// portal-rendered) dropdown renders inline and every branch is assertable.
// ---------------------------------------------------------------------------

interface CharacterLike {
  characterId: number;
  sessionExpired?: boolean;
  accessTokenPayload: { name: string };
}

let selectedCharacter: CharacterLike | null = null;
let charactersMap: Record<number, CharacterLike> = {};
const mockSelectCharacter = jest.fn<(id: number) => void>();
const mockRemoveCharacter = jest.fn<(id: number) => void>();
const mockOpenContextModal = jest.fn<(args: unknown) => void>();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => selectedCharacter,
  useAuthStore: () => ({
    characters: charactersMap,
    selectCharacter: mockSelectCharacter,
    removeCharacter: mockRemoveCharacter,
  }),
}));
jest.mock("@jitaspace/ui", () => ({ CharacterAvatar: () => null }));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("@mantine/modals", () => ({
  modals: { openConfirmModal: jest.fn() },
  openContextModal: (args: unknown) => mockOpenContextModal(args),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

jest.mock("@mantine/core", () => {
  const React = require("react") as typeof import("react");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  const Text = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("span", null, children);
  const Indicator = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  const Item = ({
    children,
    onClick,
    leftSection,
    rightSection,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    leftSection?: React.ReactNode;
    rightSection?: React.ReactNode;
  }) =>
    React.createElement(
      "button",
      { onClick },
      leftSection,
      children,
      rightSection,
    );
  const Menu = Object.assign(Passthrough, {
    Target: Passthrough,
    Dropdown: Passthrough,
    Item,
    Label: Text,
    Divider: () => null,
  });
  return {
    __esModule: true,
    Group: Passthrough,
    Indicator,
    Menu,
    Text,
    UnstyledButton: Passthrough,
    useMantineColorScheme: () => ({ colorScheme: "light" }),
    useMantineTheme: () => ({
      spacing: { md: 8 },
      colors: { dark: Array(10).fill("#111"), gray: Array(10).fill("#eee") },
      black: "#000",
    }),
  };
});

function loadUserButton() {
  return (
    require("~/layouts/MainLayout/UserButton") as {
      default: () => React.ReactElement;
    }
  ).default;
}

function makeCharacter(
  characterId: number,
  name: string,
  sessionExpired = false,
): CharacterLike {
  return { characterId, sessionExpired, accessTokenPayload: { name } };
}

describe("UserButton session-expired marking", () => {
  beforeEach(() => {
    mockSelectCharacter.mockReset();
    mockRemoveCharacter.mockReset();
    mockOpenContextModal.mockReset();
    selectedCharacter = null;
    charactersMap = {};
  });

  it("marks the active character and offers re-auth when its session is expired", () => {
    const character = makeCharacter(1, "Pilot One", true);
    selectedCharacter = character;
    charactersMap = { 1: character };

    const UserButton = loadUserButton();
    render(<UserButton />);

    expect(screen.getAllByText("Session expired").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("Sign in again"));
    expect(mockOpenContextModal).toHaveBeenCalledWith(
      expect.objectContaining({ modal: "login" }),
    );
  });

  it("does not show the expired markers for a healthy character", () => {
    const character = makeCharacter(1, "Pilot One", false);
    selectedCharacter = character;
    charactersMap = { 1: character };

    const UserButton = loadUserButton();
    render(<UserButton />);

    expect(screen.queryByText("Session expired")).toBeNull();
    expect(screen.queryByText("Sign in again")).toBeNull();
  });

  it("flags an expired character in the switcher and re-auths instead of selecting it", () => {
    const active = makeCharacter(1, "Pilot One", false);
    const other = makeCharacter(2, "Pilot Two", true);
    selectedCharacter = active;
    charactersMap = { 1: active, 2: other };

    const UserButton = loadUserButton();
    render(<UserButton />);

    expect(screen.getByText("expired")).toBeInTheDocument();

    // Clicking the expired character re-authenticates instead of switching.
    fireEvent.click(screen.getByText("Pilot Two"));
    expect(mockSelectCharacter).not.toHaveBeenCalled();
    expect(mockOpenContextModal).toHaveBeenCalledWith(
      expect.objectContaining({ modal: "login" }),
    );
  });
});
