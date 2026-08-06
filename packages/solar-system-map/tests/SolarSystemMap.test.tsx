import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";

import type { SolarSystemSceneProps } from "../SolarSystemScene";

// SolarSystemScene mounts a WebGL <Canvas> (React Three Fiber) that jsdom can't
// run, so stub it. The stub exposes the active layout mode and a button that
// fires a hover, letting us drive the wrapper's selector + hover-label logic
// without a GPU context.
jest.mock("../SolarSystemScene", () => ({
  __esModule: true,
  default: ({ mode, setHover }: SolarSystemSceneProps) => (
    <div data-testid="scene" data-mode={mode}>
      <button
        type="button"
        data-testid="fire-hover"
        onClick={() => setHover({ kind: "planet", id: 42, x: 10, y: 20 })}
      >
        fire hover
      </button>
    </div>
  ),
}));

const { SolarSystemMap } =
  require("../SolarSystemMap") as typeof import("../SolarSystemMap");

const star = { id: 1, radius: 1e9 };
const base = { star, planets: [], stations: [], stargates: [] };

describe("SolarSystemMap", () => {
  it("renders the selector, legend and hint, defaulting to compressed", () => {
    render(<SolarSystemMap {...base} />);

    expect(screen.getByRole("button", { name: "Compressed" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Realistic" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("scene")).toHaveAttribute(
      "data-mode",
      "compressed",
    );

    expect(screen.getByText("Star")).toBeInTheDocument();
    expect(screen.getByText("Stargate")).toBeInTheDocument();
    expect(screen.getByText(/drag to rotate/i)).toBeInTheDocument();
  });

  it("honours defaultMode and switches mode on a selector click", () => {
    render(<SolarSystemMap {...base} defaultMode="rings" />);
    expect(screen.getByTestId("scene")).toHaveAttribute("data-mode", "rings");

    fireEvent.click(screen.getByRole("button", { name: "Realistic" }));

    expect(screen.getByTestId("scene")).toHaveAttribute(
      "data-mode",
      "realistic",
    );
    expect(screen.getByRole("button", { name: "Realistic" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows a default hover label and a custom renderLabel one", () => {
    const { rerender } = render(<SolarSystemMap {...base} />);
    expect(screen.queryByText("Planet 42")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("fire-hover"));
    // the default label capitalises the kind
    expect(screen.getByText("Planet 42")).toBeInTheDocument();

    rerender(
      <SolarSystemMap
        {...base}
        renderLabel={({ kind, id }) => `resolved-${kind}-${id}`}
      />,
    );
    expect(screen.getByText("resolved-planet-42")).toBeInTheDocument();
    expect(screen.queryByText("Planet 42")).not.toBeInTheDocument();
  });

  it("hides the legend when showLegend is false", () => {
    render(<SolarSystemMap {...base} showLegend={false} />);
    expect(screen.queryByText("Star")).not.toBeInTheDocument();
    // the selector still renders
    expect(
      screen.getByRole("button", { name: "Compressed" }),
    ).toBeInTheDocument();
  });
});
