import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react";

import type { BodyInput, HoverKind, PlanetInput } from "../layout";
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

// Imported through the package barrel so index.ts is exercised (and therefore
// measured) too; the mock above still applies, since the barrel re-exports the
// same SolarSystemMap module.
const { LAYOUT_MODES, SolarSystemMap } =
  require("../index") as typeof import("../index");

const star = { id: 1, radius: 1e9 };
const base = { star, planets: [], stations: [], stargates: [] };

// A system with one of everything: a planet that owns a moon and two stations,
// a bare planet that owns nothing, and a stargate. Both stations are far closer
// to planet 10 than to planet 20, so both hang off planet 10 — matching how the
// scene attaches stations to their nearest planet.
const planets: PlanetInput[] = [
  {
    id: 10,
    position: [40e9, 0, 0],
    radius: 6e6,
    moons: [{ id: 11, position: [40e9 + 2e8, 0, 0], radius: 2e5 }],
  },
  { id: 20, position: [0, 0, -900e9], radius: 5e7, moons: [] },
];
const stations: BodyInput[] = [
  { id: 60, position: [41e9, 0, 0] },
  { id: 61, position: [42e9, 0, 0] },
];
const stargates: BodyInput[] = [{ id: 50, position: [0, 0, -4000e9] }];
const system = { star, planets, stations, stargates };

const label = ({ kind, id }: { kind: HoverKind; id: number }) =>
  `name-${kind}-${id}`;

/** The text alternative's list, looked up through the accessibility tree. */
const contentsList = () =>
  screen.getByRole("list", { name: "Solar system contents" });

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

  it("names the map region and groups the layout-mode buttons", () => {
    render(<SolarSystemMap {...base} />);

    expect(
      screen.getByRole("region", { name: "Solar system map" }),
    ).toBeInTheDocument();

    const group = screen.getByRole("group", { name: "Layout mode" });
    expect(within(group).getAllByRole("button")).toHaveLength(
      LAYOUT_MODES.length,
    );
    expect(
      within(group).getByRole("button", { name: "Compressed" }),
    ).toBeInTheDocument();
  });

  it("hides the legend when showLegend is false", () => {
    render(<SolarSystemMap {...base} showLegend={false} />);
    expect(screen.queryByText("Star")).not.toBeInTheDocument();
    // the selector still renders
    expect(
      screen.getByRole("button", { name: "Compressed" }),
    ).toBeInTheDocument();
  });

  it("keeps the pointer-only hint out of the accessibility tree", () => {
    render(<SolarSystemMap {...base} />);
    // every affordance it lists is a pointer gesture, so it has nothing to say
    // to a screen-reader user — the text alternative carries the names instead
    expect(screen.getByText(/drag to rotate/i)).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

describe("SolarSystemMap text alternative", () => {
  it("lists every body the canvas draws", () => {
    render(<SolarSystemMap {...system} renderLabel={label} />);

    const contents = contentsList();
    for (const name of [
      "Star: name-star-1",
      "Planet: name-planet-10",
      "Planet: name-planet-20",
      "Moon: name-moon-11",
      "Station: name-station-60",
      "Station: name-station-61",
      "Stargate: name-stargate-50",
    ]) {
      expect(within(contents).getByText(name)).toBeInTheDocument();
    }

    // the star, both planets and the stargate — the stations and the moon are
    // nested inside planet 10 rather than sitting at the top level
    expect(contents.children).toHaveLength(4);
  });

  it("nests a planet's moons and stations inside that planet's entry", () => {
    render(<SolarSystemMap {...system} renderLabel={label} />);

    const contents = contentsList();
    const planet = within(contents).getByText("Planet: name-planet-10");
    expect(planet.tagName).toBe("LI");
    expect(
      within(planet)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Moon: name-moon-11",
      "Station: name-station-60",
      "Station: name-station-61",
    ]);

    // a planet with neither moons nor stations gets no empty child list
    const bare = within(contents).getByText("Planet: name-planet-20");
    expect(within(bare).queryAllByRole("listitem")).toHaveLength(0);
    expect(bare.querySelector("ul")).toBeNull();
  });

  it("lists stations at the top level when the system has no planets", () => {
    render(
      <SolarSystemMap
        star={star}
        planets={[]}
        stations={[{ id: 70, position: [1e9, 0, 0] }]}
        stargates={[]}
        renderLabel={label}
      />,
    );

    const contents = contentsList();
    expect(
      within(contents).getByText("Station: name-station-70"),
    ).toBeInTheDocument();
    // nothing to nest under, so it sits alongside the star
    expect(contents.children).toHaveLength(2);
  });

  it("falls back to the capitalised kind and id without renderLabel", () => {
    render(<SolarSystemMap {...system} />);

    const contents = contentsList();
    for (const name of [
      "Star: Star 1",
      "Planet: Planet 10",
      "Moon: Moon 11",
      "Station: Station 60",
      "Stargate: Stargate 50",
    ]) {
      expect(within(contents).getByText(name)).toBeInTheDocument();
    }
  });

  it("hides the list visually without hiding it from assistive technology", () => {
    render(<SolarSystemMap {...system} renderLabel={label} />);

    // getByRole skips anything pruned from the accessibility tree, so resolving
    // the list through it at all is the assertion that matters here
    const contents = contentsList();
    expect(
      within(
        screen.getByRole("region", { name: "Solar system map" }),
      ).getByRole("list", { name: "Solar system contents" }),
    ).toBe(contents);

    // clipped out of sight rather than removed: each of these would also strip
    // it from the accessibility tree, and then getByRole could not have found it
    expect(contents).not.toHaveAttribute("hidden");
    expect(contents).not.toHaveAttribute("aria-hidden");
    expect(contents.style.display).not.toBe("none");
    expect(contents.style.visibility).not.toBe("hidden");
    expect(contents).toHaveStyle({
      position: "absolute",
      width: "1px",
      height: "1px",
      overflow: "hidden",
    });
    expect(contents.style.clipPath).toBe("inset(50%)");
  });

  it("renders by default and can be opted out of with describeContents", () => {
    const { rerender } = render(<SolarSystemMap {...system} />);
    expect(contentsList()).toBeInTheDocument();

    rerender(<SolarSystemMap {...system} describeContents={false} />);
    expect(
      screen.queryByRole("list", { name: "Solar system contents" }),
    ).not.toBeInTheDocument();
    // the visible map is untouched
    expect(
      screen.getByRole("button", { name: "Compressed" }),
    ).toBeInTheDocument();
  });
});
