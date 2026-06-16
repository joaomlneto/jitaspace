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
