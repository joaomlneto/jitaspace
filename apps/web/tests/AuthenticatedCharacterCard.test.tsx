import "@testing-library/jest-dom/jest-globals";

import type React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// On the home page each authenticated character is shown as an
// AuthenticatedCharacterCard. When EVE can no longer refresh the character's
// token the card must flag it ("Session expired") and offer a "Sign in again"
// action that opens the login flow — without removing the character. We stub
// the heavy presentational deps so only the card's own logic runs.
// ---------------------------------------------------------------------------

interface CharacterLike {
  characterId: number;
  corporationId: number;
  allianceId?: number;
  sessionExpired?: boolean;
  accessTokenPayload: { name: string };
}

let character: CharacterLike | null = null;
const mockOpenContextModal = jest.fn<(args: unknown) => void>();
const mockOpenConfirmModal =
  jest.fn<(args: { onConfirm?: () => void }) => void>();
const mockRemoveCharacter = jest.fn<(characterId: number) => void>();

jest.mock("@jitaspace/hooks", () => ({
  useAuthenticatedCharacter: () => character,
  useCharacterSkills: () => ({ data: undefined, hasToken: false }),
  useAuthStore: (
    selector: (state: {
      removeCharacter: typeof mockRemoveCharacter;
    }) => unknown,
  ) => selector({ removeCharacter: mockRemoveCharacter }),
}));
jest.mock(
  "@jitaspace/hooks/src/hooks/character/useCharacterWalletBalance",
  () => ({
    useCharacterWalletBalance: () => ({ data: undefined, isAllowed: false }),
  }),
);
jest.mock(
  "@jitaspace/eve-components",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));
jest.mock("~/components/Card", () => new Proxy({}, { get: () => () => null }));
jest.mock(
  "~/components/Fitting",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("~/components/Menu", () => new Proxy({}, { get: () => () => null }));
jest.mock("@mantine/modals", () => ({
  modals: {
    openConfirmModal: (args: { onConfirm?: () => void }) =>
      mockOpenConfirmModal(args),
  },
  openContextModal: (args: unknown) => mockOpenContextModal(args),
}));

jest.mock("@mantine/core", () => {
  const React = require("react") as typeof import("react");
  const frag = (p: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, p.children);
  const Text = (p: { children?: React.ReactNode }) =>
    React.createElement("span", null, p.children);
  const Card = Object.assign(frag, { Section: frag });
  const Alert = (p: { title?: React.ReactNode; children?: React.ReactNode }) =>
    React.createElement(
      "div",
      null,
      React.createElement("span", null, p.title),
      p.children,
    );
  const Button = (p: { children?: React.ReactNode; onClick?: () => void }) =>
    React.createElement("button", { onClick: p.onClick }, p.children);
  return {
    __esModule: true,
    Alert,
    Burger: () => null,
    Button,
    Card,
    Group: frag,
    Skeleton: frag,
    Stack: frag,
    Text,
    UnstyledButton: frag,
  };
});

function loadCard() {
  return (
    require("~/components/Card/AuthenticatedCharacterCard/AuthenticatedCharacterCard") as typeof import("~/components/Card/AuthenticatedCharacterCard/AuthenticatedCharacterCard")
  ).AuthenticatedCharacterCard;
}

describe("AuthenticatedCharacterCard session-expired marking", () => {
  beforeEach(() => {
    mockOpenContextModal.mockReset();
    mockOpenConfirmModal.mockReset();
    mockRemoveCharacter.mockReset();
    character = null;
  });

  it("flags an expired session and offers re-authentication", () => {
    character = {
      characterId: 100,
      corporationId: 98,
      sessionExpired: true,
      accessTokenPayload: { name: "Aria Valen" },
    };
    const AuthenticatedCharacterCard = loadCard();
    render(<AuthenticatedCharacterCard characterId={100} />);

    expect(screen.getByText("Session expired")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Sign in again"));
    expect(mockOpenContextModal).toHaveBeenCalledWith(
      expect.objectContaining({ modal: "login" }),
    );
  });

  it("removes the character after confirmation", () => {
    character = {
      characterId: 100,
      corporationId: 98,
      sessionExpired: true,
      accessTokenPayload: { name: "Aria Valen" },
    };
    const AuthenticatedCharacterCard = loadCard();
    render(<AuthenticatedCharacterCard characterId={100} />);

    fireEvent.click(screen.getByText("Remove character"));
    expect(mockOpenConfirmModal).toHaveBeenCalledTimes(1);
    expect(mockRemoveCharacter).not.toHaveBeenCalled();

    // Confirming in the modal performs the removal.
    const confirmArgs = mockOpenConfirmModal.mock.calls[0]?.[0];
    confirmArgs?.onConfirm?.();
    expect(mockRemoveCharacter).toHaveBeenCalledWith(100);
  });

  it("shows no expiry banner for a healthy character", () => {
    character = {
      characterId: 100,
      corporationId: 98,
      sessionExpired: false,
      accessTokenPayload: { name: "Pilot One" },
    };
    const AuthenticatedCharacterCard = loadCard();
    render(<AuthenticatedCharacterCard characterId={100} />);

    expect(screen.queryByText("Session expired")).toBeNull();
    expect(screen.queryByText("Sign in again")).toBeNull();
  });
});
