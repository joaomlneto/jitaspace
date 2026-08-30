import "@testing-library/jest-dom/jest-globals";

import type React from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

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
// The wallet and skill-point rows are driven by two independent hooks behind two
// independent permission gates, so the tests need to move them separately.
// Both hooks spread a React Query result whose `data` is the ESI response
// envelope, so the payload sits one level down at `.data.data` — which is why
// the component reads `balance?.data` and `skills?.data.total_sp`.
let wallet: { data?: { data: number }; isAllowed: boolean } = {
  isAllowed: false,
};
let skills: { data?: { data: { total_sp: number } }; hasToken: boolean } = {
  hasToken: false,
};
const mockOpenContextModal = jest.fn<(args: unknown) => void>();
const mockOpenConfirmModal =
  jest.fn<(args: { onConfirm?: () => void }) => void>();
const mockRemoveCharacter = jest.fn<(characterId: number) => void>();

jest.mock("@jitaspace/hooks", () => ({
  useAuthenticatedCharacter: () => character,
  useCharacterSkills: () => skills,
  useAuthStore: (
    selector: (state: {
      removeCharacter: typeof mockRemoveCharacter;
    }) => unknown,
  ) => selector({ removeCharacter: mockRemoveCharacter }),
}));
jest.mock(
  "@jitaspace/hooks/src/hooks/character/useCharacterWalletBalance",
  () => ({
    useCharacterWalletBalance: () => wallet,
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
    // Not a fragment: `visible` is the thing under test, so it has to reach the DOM.
    Skeleton: (p: { visible?: boolean; children?: React.ReactNode }) =>
      React.createElement(
        "div",
        { "data-testid": "skeleton", "data-visible": String(!!p.visible) },
        p.children,
      ),
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
    wallet = { isAllowed: false };
    skills = { hasToken: false };
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

/**
 * Regression: the skill-point row was copy-pasted from the wallet-balance row
 * above it and its Skeleton kept gating on `!balance?.data`. The two rows are
 * driven by unrelated hooks behind unrelated scopes, so a character who granted
 * the skills scope but not the wallet scope left the SP row shimmering forever.
 */
describe("AuthenticatedCharacterCard wallet and skill-point rows", () => {
  // This suite owns its own reset: `beforeEach` is per-describe, and the file
  // has no global auto-cleanup, so without these each test would inherit the
  // previous one's hook state and its rendered DOM.
  beforeEach(() => {
    character = {
      characterId: 100,
      corporationId: 98,
      accessTokenPayload: { name: "Pilot One" },
    };
    wallet = { isAllowed: false };
    skills = { hasToken: false };
  });

  afterEach(() => {
    cleanup();
  });

  const renderCard = () => {
    const AuthenticatedCharacterCard = loadCard();
    return render(<AuthenticatedCharacterCard characterId={100} />);
  };

  // Identify each row by what it renders rather than by position, so the
  // assertions survive another skeleton being added to the card.
  const spRow = () =>
    screen
      .queryAllByTestId("skeleton")
      .find((el) => el.textContent.includes("SP"));
  const walletRow = () =>
    screen
      .queryAllByTestId("skeleton")
      .find((el) => !el.textContent.includes("SP"));

  it("resolves the SP row on skills alone, with no wallet access at all", () => {
    skills = { data: { data: { total_sp: 5_000_000 } }, hasToken: true };
    renderCard();

    // The bug: this row gated on the wallet, which a character without the
    // wallet scope never resolves, so it shimmered forever.
    expect(spRow()).toHaveAttribute("data-visible", "false");
    expect(walletRow()).toBeUndefined();
  });

  it("keeps the SP row loading while only the wallet has resolved", () => {
    skills = { hasToken: true };
    wallet = { data: { data: 1234 }, isAllowed: true };
    renderCard();

    // The mirror image: gating on the wallet used to reveal an empty " SP".
    expect(walletRow()).toHaveAttribute("data-visible", "false");
    expect(spRow()).toHaveAttribute("data-visible", "true");
  });

  it("resolves each row on its own hook", () => {
    skills = { data: { data: { total_sp: 5_000_000 } }, hasToken: true };
    wallet = { data: { data: 1234 }, isAllowed: true };
    renderCard();

    expect(walletRow()).toHaveAttribute("data-visible", "false");
    expect(spRow()).toHaveAttribute("data-visible", "false");
  });

  it("renders neither row without the scopes", () => {
    renderCard();
    expect(screen.queryAllByTestId("skeleton")).toHaveLength(0);
  });
});
