import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUseSolarSystem =
  jest.fn<() => { data?: { data: { name?: string } } }>();

jest.mock("@jitaspace/hooks", () => ({
  useSolarSystem: (...args: unknown[]) => mockUseSolarSystem(...args),
}));

jest.mock("~/components/Avatar", () => ({
  SolarSystemStarAvatar: ({
    solarSystemId,
  }: {
    solarSystemId?: number;
  }) => (
    <span data-testid="star-avatar">{`star-${solarSystemId ?? "none"}`}</span>
  ),
}));

function renderButton(solarSystemId?: number) {
  const {
    SolarSystemButton,
  } = require("~/components/Button/SolarSystemButton");
  return render(
    <MantineProvider>
      <SolarSystemButton solarSystemId={solarSystemId} />
    </MantineProvider>,
  );
}

describe("SolarSystemButton", () => {
  beforeEach(() => {
    mockUseSolarSystem.mockReset();
    mockUseSolarSystem.mockReturnValue({ data: undefined });
  });

  it("renders without crashing when no solar system id is provided", () => {
    renderButton(undefined);
    expect(screen.getByTestId("star-avatar")).toHaveTextContent("star-none");
  });

  it("renders the star avatar with the given solar system id", () => {
    renderButton(30000142);
    expect(screen.getByTestId("star-avatar")).toHaveTextContent("star-30000142");
  });

  it("renders the solar system name from the hook data", () => {
    mockUseSolarSystem.mockReturnValue({ data: { data: { name: "Jita" } } });
    renderButton(30000142);
    expect(screen.getByText("Jita")).toBeInTheDocument();
  });

  it("renders no name text when the hook has no data", () => {
    mockUseSolarSystem.mockReturnValue({ data: undefined });
    const { container } = renderButton(30000142);
    // The text node is empty; the button still renders
    expect(container.querySelector("button")).toBeInTheDocument();
  });

  it("calls useSolarSystem with the id and an enabled-query option", () => {
    renderButton(30000142);
    expect(mockUseSolarSystem).toHaveBeenCalledWith(
      30000142,
      {},
      { query: { enabled: true } },
    );
  });

  it("disables the query when no id is provided (enabled: false)", () => {
    renderButton(undefined);
    expect(mockUseSolarSystem).toHaveBeenCalledWith(
      0,
      {},
      { query: { enabled: false } },
    );
  });
});
