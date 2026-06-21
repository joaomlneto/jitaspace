import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */

const mockUseSelectedCharacter = jest.fn();
const mockUseAuthStoreHasHydrated = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
}));
jest.mock("~/hooks/useAuthStoreHasHydrated", () => ({
  useAuthStoreHasHydrated: () => mockUseAuthStoreHasHydrated(),
}));
jest.mock("~/components/ScopeGuard/RequestPermissionsBanner", () => ({
  RequestPermissionsBanner: () => <div>request permissions</div>,
}));

// Required after the mocks are registered so ScopeGuard picks up the mocked hooks.
const { ScopeGuard } = require("~/components/ScopeGuard/ScopeGuard");

const SCOPE = "esi-wallet.read_character_wallet.v1";

function renderGuard(ui: ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("ScopeGuard", () => {
  beforeEach(() => {
    mockUseSelectedCharacter.mockReset().mockReturnValue(null);
    mockUseAuthStoreHasHydrated.mockReset().mockReturnValue(true);
  });

  it("renders children when no scopes are required", () => {
    renderGuard(
      <ScopeGuard>
        <div>content</div>
      </ScopeGuard>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("shows the loading placeholder while the auth store is rehydrating", () => {
    mockUseAuthStoreHasHydrated.mockReturnValue(false);
    renderGuard(
      <ScopeGuard
        requiredScopes={[SCOPE]}
        loadingScopesComponent={<div>loading</div>}
      >
        <div>content</div>
      </ScopeGuard>,
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
    // crucially, the permission banner is NOT flashed while hydrating
    expect(screen.queryByText("request permissions")).not.toBeInTheDocument();
  });

  it("renders nothing while rehydrating if no loading placeholder is given", () => {
    mockUseAuthStoreHasHydrated.mockReturnValue(false);
    renderGuard(
      <ScopeGuard requiredScopes={[SCOPE]}>
        <div>content</div>
      </ScopeGuard>,
    );
    expect(screen.queryByText("content")).not.toBeInTheDocument();
    expect(screen.queryByText("request permissions")).not.toBeInTheDocument();
  });

  it("shows the permission banner once hydrated when the scope is missing", () => {
    mockUseAuthStoreHasHydrated.mockReturnValue(true);
    mockUseSelectedCharacter.mockReturnValue(null);
    renderGuard(
      <ScopeGuard requiredScopes={[SCOPE]}>
        <div>content</div>
      </ScopeGuard>,
    );
    expect(screen.getByText("request permissions")).toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("renders a custom insufficient-scopes component when provided", () => {
    mockUseSelectedCharacter.mockReturnValue(null);
    renderGuard(
      <ScopeGuard
        requiredScopes={[SCOPE]}
        insufficientScopesComponent={<div>access denied</div>}
      >
        <div>content</div>
      </ScopeGuard>,
    );
    expect(screen.getByText("access denied")).toBeInTheDocument();
  });

  it("renders children once hydrated when the scope is granted", () => {
    mockUseAuthStoreHasHydrated.mockReturnValue(true);
    mockUseSelectedCharacter.mockReturnValue({
      accessTokenPayload: { scp: [SCOPE] },
    });
    renderGuard(
      <ScopeGuard requiredScopes={[SCOPE]}>
        <div>content</div>
      </ScopeGuard>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.queryByText("request permissions")).not.toBeInTheDocument();
  });
});
