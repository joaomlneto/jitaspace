import "@testing-library/jest-dom/jest-globals";

import type React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// On phones the account controls live inline in the navigation drawer (a
// dropdown nested in a full-screen drawer used to open *behind* it, so the
// active character could not be changed and Settings / Logout were
// unreachable). Every account action must close the drawer before it acts, so
// the modal it opens is never covered.
// ---------------------------------------------------------------------------

interface CharacterLike {
  characterId: number;
  sessionExpired?: boolean;
  accessTokenPayload: { name: string };
}

let selectedCharacter: CharacterLike | null = null;
let charactersMap: Record<number, CharacterLike> = {};
const mockSelectCharacter = jest.fn<(id: number) => void>();
const mockOpenContextModal = jest.fn<(args: unknown) => void>();
const mockOpenConfirmModal = jest.fn<(args: unknown) => void>();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => selectedCharacter,
  useAuthStore: () => ({
    characters: charactersMap,
    selectCharacter: mockSelectCharacter,
    removeCharacter: jest.fn(),
  }),
}));
jest.mock("@jitaspace/ui", () => ({
  CharacterAvatar: () => null,
  LoginWithEveOnlineButton: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      Log in with EVE Online
    </button>
  ),
}));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("@mantine/modals", () => ({
  modals: { openConfirmModal: (args: unknown) => mockOpenConfirmModal(args) },
  openContextModal: (args: unknown) => mockOpenContextModal(args),
}));
jest.mock("@mantine/spotlight", () => ({ openSpotlight: jest.fn() }));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("~/config/apps", () => ({
  jitaApps: {
    character: {
      name: "Character",
      Icon: () => null,
      apps: { mail: { name: "EveMail", url: "/mail", Icon: () => null } },
    },
  },
}));

function renderDrawer(close: () => void) {
  const { MobileNavDrawer } =
    require("~/layouts/MainLayout/HeaderMenu/MobileNavDrawer") as {
      MobileNavDrawer: (props: {
        opened: boolean;
        close: () => void;
      }) => React.ReactElement;
    };
  render(
    <MantineProvider env="test">
      <MobileNavDrawer opened close={close} />
    </MantineProvider>,
  );
}

function makeCharacter(
  characterId: number,
  name: string,
  sessionExpired = false,
): CharacterLike {
  return { characterId, sessionExpired, accessTokenPayload: { name } };
}

describe("MobileNavDrawer account section", () => {
  beforeEach(() => {
    mockSelectCharacter.mockReset();
    mockOpenContextModal.mockReset();
    mockOpenConfirmModal.mockReset();
    const one = makeCharacter(1, "Pilot One");
    const two = makeCharacter(2, "Pilot Two");
    const three = makeCharacter(3, "Pilot Three", true);
    selectedCharacter = one;
    charactersMap = { 1: one, 2: two, 3: three };
  });

  it("switches character inline and closes the drawer", () => {
    const close = jest.fn();
    renderDrawer(close);

    expect(screen.getByText("Pilot One")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Pilot Two"));

    expect(close).toHaveBeenCalledTimes(1);
    expect(mockSelectCharacter).toHaveBeenCalledWith(2);
  });

  it("re-authenticates an expired character instead of selecting it", () => {
    const close = jest.fn();
    renderDrawer(close);

    expect(screen.getByText("expired")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Pilot Three"));

    expect(close).toHaveBeenCalledTimes(1);
    expect(mockSelectCharacter).not.toHaveBeenCalled();
    expect(mockOpenContextModal).toHaveBeenCalledWith(
      expect.objectContaining({ modal: "login" }),
    );
  });

  it("closes the drawer before opening settings, add character and logout", () => {
    const close = jest.fn();
    renderDrawer(close);

    fireEvent.click(screen.getByText("Settings"));
    expect(mockOpenContextModal).toHaveBeenLastCalledWith(
      expect.objectContaining({ modal: "settings" }),
    );
    fireEvent.click(screen.getByText("Add Character"));
    expect(mockOpenContextModal).toHaveBeenLastCalledWith(
      expect.objectContaining({ modal: "login" }),
    );
    fireEvent.click(screen.getByText("Logout"));
    expect(mockOpenConfirmModal).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Log out Pilot One?" }),
    );
    expect(close).toHaveBeenCalledTimes(3);
  });

  it("offers sign-in again when the active session expired", () => {
    selectedCharacter = makeCharacter(1, "Pilot One", true);
    charactersMap = { 1: selectedCharacter };
    const close = jest.fn();
    renderDrawer(close);

    expect(screen.getByText("Session expired")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Sign in again"));
    expect(close).toHaveBeenCalledTimes(1);
    expect(mockOpenContextModal).toHaveBeenCalledWith(
      expect.objectContaining({ modal: "login" }),
    );
  });

  it("shows the login button when nobody is signed in", () => {
    selectedCharacter = null;
    charactersMap = {};
    const close = jest.fn();
    renderDrawer(close);

    expect(screen.queryByText("Settings")).toBeNull();
    fireEvent.click(screen.getByText("Log in with EVE Online"));
    expect(close).toHaveBeenCalledTimes(1);
    expect(mockOpenContextModal).toHaveBeenCalledWith(
      expect.objectContaining({ modal: "login" }),
    );
  });
});
