import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// LoginModal builds a default scope set from ~/config/apps, then offers a
// "log in with all scopes" flow plus a per-app "Customize" selector. We stub
// the config (so the module-level scope aggregation has a known shape), the
// ScopeGuard cards, the ScopesTable, the EVE login button, and the login
// redirect helper. jest.mock is NOT auto-hoisted here, so the modal is
// lazy-require()d inside each test AFTER the mocks are registered.
// ---------------------------------------------------------------------------

jest.mock("~/config/apps", () => ({
  characterApps: {
    mail: {
      name: "EveMail",
      scopes: {
        required: [{ reason: "Read Mail", scopes: ["esi-mail.read_mail.v1"] }],
        optional: [],
      },
    },
  },
  extraJitaFeatures: [
    { reason: "Affiliation", scopes: ["esi-extra.affiliation.v1"] },
  ],
}));

const mockLoginWithEveOnline = jest.fn();
jest.mock("~/lib/eveOnlineLogin", () => ({
  loginWithEveOnline: (...args: unknown[]) => mockLoginWithEveOnline(...args),
}));

jest.mock("@jitaspace/ui", () => ({
  LoginWithEveOnlineButton: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      Log in with EVE Online
    </button>
  ),
}));

jest.mock("~/components/ScopeGuard", () => ({
  AppCheckboxCard: ({ app }: { app: { name: string } }) => (
    <div data-testid="app-checkbox-card">{`app-${app.name}`}</div>
  ),
  AppScopeSetCheckboxCard: ({
    scopeSet,
  }: {
    scopeSet: { reason: string };
  }) => (
    <div data-testid="app-scope-set-card">{`scopeset-${scopeSet.reason}`}</div>
  ),
  ScopesTable: ({ scopes }: { scopes: string[] }) => (
    <div data-testid="scopes-table">{`scopes-${scopes.length}`}</div>
  ),
}));

function renderModal(innerProps: { scopes?: string[] } = {}) {
  const { LoginModal } = require("~/components/Modals/LoginModal");
  render(
    <MantineProvider>
      <LoginModal
        context={{ closeModal: jest.fn() } as never}
        id="login"
        innerProps={innerProps}
      />
    </MantineProvider>,
  );
}

describe("LoginModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the default login prompt and EVE login button", () => {
    renderModal();
    expect(
      screen.getByText(/Click to log in with all required scopes/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Log in with EVE Online" }),
    ).toBeInTheDocument();
    // The app selector is collapsed by default.
    expect(screen.queryByTestId("app-checkbox-card")).not.toBeInTheDocument();
  });

  it("starts the EVE login with the requested innerProps scopes", async () => {
    const user = userEvent.setup();
    renderModal({ scopes: ["esi-mail.read_mail.v1"] });

    await user.click(
      screen.getByRole("button", { name: "Log in with EVE Online" }),
    );
    expect(mockLoginWithEveOnline).toHaveBeenCalledTimes(1);
    expect(mockLoginWithEveOnline).toHaveBeenCalledWith([
      "esi-mail.read_mail.v1",
    ]);
  });

  it("reveals the per-app selector when Customize is clicked", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Customize" }));
    expect(
      screen.getByText(/Select which features you would like to enable/i),
    ).toBeInTheDocument();
    // App card + extra-feature scope-set card from the mocked config render.
    expect(screen.getByTestId("app-checkbox-card")).toHaveTextContent(
      "app-EveMail",
    );
    expect(screen.getByTestId("app-scope-set-card")).toHaveTextContent(
      "scopeset-Affiliation",
    );
  });

  it("expands the scopes table when 'Show scopes to be requested' is clicked", async () => {
    const user = userEvent.setup();
    renderModal({ scopes: ["esi-mail.read_mail.v1"] });

    await user.click(
      screen.getByRole("button", { name: "Show scopes to be requested" }),
    );
    expect(screen.getByText(/List of scopes to be requested/i)).toBeVisible();
    expect(screen.getByTestId("scopes-table")).toHaveTextContent("scopes-1");
  });
});
