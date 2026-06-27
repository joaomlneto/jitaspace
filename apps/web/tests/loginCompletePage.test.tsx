import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";

import {
  captureExceptionMock,
  captureMock,
  identifyMock,
} from "../__mocks__/posthogMocks";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// Stub Mantine so the test doesn't need a provider; we only care about the
// page's own logic, not Mantine's rendering.
jest.mock("@mantine/core", () => ({
  Center: ({ children }: { children?: unknown }) => children,
  Stack: ({ children }: { children?: unknown }) => children,
  Text: ({ children }: { children?: unknown }) => children,
  Loader: () => null,
}));

const mockConsumeLoginResult = jest.fn();
jest.mock("../app/login/complete/actions", () => ({
  consumeLoginResult: () => mockConsumeLoginResult(),
}));

const mockAddCharacter = jest.fn();
const mockRehydrate = jest.fn();
let mockSelectedCharacter: number | undefined;
jest.mock("@jitaspace/hooks", () => ({
  useAuthStore: {
    getState: () => ({
      addCharacter: mockAddCharacter,
      selectedCharacter: mockSelectedCharacter,
    }),
    persist: { rehydrate: mockRehydrate },
  },
}));

const loadPage = () =>
  (
    require("../app/login/complete/page") as {
      default: () => React.ReactElement;
    }
  ).default;

describe("LoginCompletePage", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockConsumeLoginResult.mockReset();
    mockAddCharacter.mockReset().mockResolvedValue(undefined);
    mockRehydrate.mockReset().mockResolvedValue(undefined);
    mockSelectedCharacter = undefined;
    identifyMock.mockClear();
    captureMock.mockClear();
    captureExceptionMock.mockClear();
  });

  it("adds the authenticated character and redirects to a safe returnTo", async () => {
    window.history.pushState({}, "", "/login/complete?returnTo=/skills");
    mockConsumeLoginResult.mockResolvedValue({
      accessToken: "AT",
      encryptedRefreshToken: "ERT",
    });

    const LoginCompletePage = loadPage();
    render(<LoginCompletePage />);

    await waitFor(() =>
      expect(mockAddCharacter).toHaveBeenCalledWith({
        accessToken: "AT",
        refreshToken: "ERT",
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/skills"));
  });

  it("identifies the character and captures user_logged_in on success", async () => {
    window.history.pushState({}, "", "/login/complete?returnTo=/skills");
    mockSelectedCharacter = 90000001;
    mockConsumeLoginResult.mockResolvedValue({
      accessToken: "AT",
      encryptedRefreshToken: "ERT",
    });

    const LoginCompletePage = loadPage();
    render(<LoginCompletePage />);

    await waitFor(() =>
      expect(identifyMock).toHaveBeenCalledWith("90000001", {
        eve_character_id: 90000001,
      }),
    );
    expect(captureMock).toHaveBeenCalledWith("user_logged_in", {
      character_id: 90000001,
    });
  });

  it("captures the exception when completion fails", async () => {
    window.history.pushState({}, "", "/login/complete");
    mockConsumeLoginResult.mockRejectedValue(new Error("boom"));

    const LoginCompletePage = loadPage();
    render(<LoginCompletePage />);

    await waitFor(() => expect(captureExceptionMock).toHaveBeenCalled());
  });

  it("redirects to / when there is no pending result", async () => {
    window.history.pushState({}, "", "/login/complete");
    mockConsumeLoginResult.mockResolvedValue(null);

    const LoginCompletePage = loadPage();
    render(<LoginCompletePage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(mockAddCharacter).not.toHaveBeenCalled();
  });

  it("shows an error message when completion fails", async () => {
    window.history.pushState({}, "", "/login/complete");
    mockConsumeLoginResult.mockRejectedValue(new Error("boom"));

    const LoginCompletePage = loadPage();
    render(<LoginCompletePage />);

    await waitFor(() =>
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument(),
    );
  });
});
