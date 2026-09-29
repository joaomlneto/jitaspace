import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ServerStatusIndicator only reads the server-status query from @jitaspace/hooks.
// Mock it so every branch (loading / online / VIP / down) can be exercised.
const mockUseServerStatus = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useServerStatus: () => mockUseServerStatus(),
}));

function renderIndicator() {
  const {
    ServerStatusIndicator,
  } = require("~/components/ServerStatus/ServerStatusIndicator");
  return render(
    <MantineProvider>
      <ServerStatusIndicator />
    </MantineProvider>,
  );
}

describe("ServerStatusIndicator", () => {
  beforeEach(() => {
    mockUseServerStatus.mockReset();
  });

  it("shows a checking state while the status is loading", () => {
    mockUseServerStatus.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: true,
      isSuccess: false,
    });
    renderIndicator();
    expect(screen.getByText("Checking...")).toBeInTheDocument();
  });

  it("shows the formatted player count when TQ is online (not VIP)", () => {
    mockUseServerStatus.mockReturnValue({
      data: { data: { players: 31234, vip: false } },
      isError: false,
      isLoading: false,
      isSuccess: true,
    });
    renderIndicator();
    expect(screen.getByText("31,234")).toBeInTheDocument();
    expect(screen.queryByText("VIP Mode")).not.toBeInTheDocument();
  });

  it("shows VIP Mode when the server is in VIP mode", () => {
    mockUseServerStatus.mockReturnValue({
      data: { data: { players: 50, vip: true } },
      isError: false,
      isLoading: false,
      isSuccess: true,
    });
    renderIndicator();
    expect(screen.getByText("VIP Mode")).toBeInTheDocument();
  });

  it("survives a status response without a player count", () => {
    // ESI's schema says `players` is always present; real responses have
    // arrived without it (Sentry JITASPACE-5E). The indicator is in the header
    // of every page, so throwing here took the whole page down.
    mockUseServerStatus.mockReturnValue({
      data: { data: { server_version: "2934576", vip: false } },
      isError: false,
      isLoading: false,
      isSuccess: true,
    });
    renderIndicator();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("survives a null player count too", () => {
    mockUseServerStatus.mockReturnValue({
      data: { data: { players: null, vip: false } },
      isError: false,
      isLoading: false,
      isSuccess: true,
    });
    renderIndicator();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("colours VIP mode yellow, not green", () => {
    // A server in VIP mode answers the status request successfully too, so
    // checking success first made the VIP colour unreachable.
    const {
      serverStatusColor,
    } = require("~/components/ServerStatus/ServerStatusIndicator");
    expect(serverStatusColor({ isSuccess: true, isVip: true })).toBe("yellow");
    expect(serverStatusColor({ isSuccess: true, isVip: false })).toBe("green");
    expect(serverStatusColor({ isSuccess: false, isVip: false })).toBe("red");
  });

  it("shows TQ Down when the status request did not succeed", () => {
    mockUseServerStatus.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
      isSuccess: false,
    });
    renderIndicator();
    expect(screen.getByText("TQ Down")).toBeInTheDocument();
  });
});
