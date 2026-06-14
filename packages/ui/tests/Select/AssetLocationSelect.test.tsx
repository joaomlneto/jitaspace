import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// AssetLocationSelect reads the character's asset locations and resolves their
// names from @jitaspace/hooks. Mock both so the option-building / filtering /
// name-from-cache logic runs without real ESI assets.
// ---------------------------------------------------------------------------
const mockUseCharacterAssets = jest.fn();
const mockUseEsiNameLookup = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useCharacterAssets: (...a: unknown[]) => mockUseCharacterAssets(...a),
  useEsiNameLookup: (...a: unknown[]) => mockUseEsiNameLookup(...a),
}));

const {
  AssetLocationSelect,
} = require("../../Select/AssetLocationSelect/AssetLocationSelect") as typeof import("../../Select/AssetLocationSelect/AssetLocationSelect");

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

// A realistic locations map keyed by location_id; one "item" entry that must
// be filtered out of the options, plus two real stations/structures.
const sampleLocations = {
  "60003760": {
    location_id: 60003760,
    location_type: "station",
  },
  "1021000000001": {
    location_id: 1021000000001,
    location_type: "solar_system",
  },
  "1038001234567": {
    location_id: 1038001234567,
    location_type: "item",
  },
};

beforeEach(() => {
  mockUseCharacterAssets.mockReturnValue({ locations: sampleLocations });
  mockUseEsiNameLookup.mockReturnValue({
    "60003760": { value: { name: "Jita IV - Moon 4 - Caldari Navy" } },
    "1021000000001": { value: { name: "Jita" } },
    "1038001234567": { value: { name: "Some Container" } },
  });
});

describe("AssetLocationSelect", () => {
  it("renders a searchable select input", () => {
    renderWithMantine(<AssetLocationSelect />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    // It looks up names for every location in the assets map.
    expect(mockUseEsiNameLookup).toHaveBeenCalled();
  });

  it("builds options from non-item locations with resolved names + type", async () => {
    renderWithMantine(<AssetLocationSelect />);
    await userEvent.click(screen.getByRole("combobox"));

    // Station + solar_system locations become options labelled "name (type)".
    expect(
      screen.getByRole("option", {
        name: "Jita IV - Moon 4 - Caldari Navy (station)",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Jita (solar_system)", hidden: true }),
    ).toBeInTheDocument();
  });

  it("filters out locations whose type is 'item'", async () => {
    renderWithMantine(<AssetLocationSelect />);
    await userEvent.click(screen.getByRole("combobox"));
    // The "item" location must not appear as an option.
    expect(
      screen.queryByRole("option", {
        name: /Some Container/,
        hidden: true,
      }),
    ).not.toBeInTheDocument();
  });

  it("selecting a location forwards the chosen value to onChange", async () => {
    const onChange = jest.fn();
    renderWithMantine(<AssetLocationSelect onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(
      screen.getByRole("option", {
        name: "Jita (solar_system)",
        hidden: true,
      }),
    );

    // The component spreads otherProps.onChange and forwards the location_id
    // string of the picked option.
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0]?.[0]).toBe("1021000000001");
    // The picked option's label is reflected in the input.
    expect(screen.getByRole("combobox")).toHaveValue("Jita (solar_system)");
  });

  it("renders without options when the character has no locations", () => {
    mockUseCharacterAssets.mockReturnValue({ locations: {} });
    mockUseEsiNameLookup.mockReturnValue({});
    renderWithMantine(<AssetLocationSelect />);
    // Still renders the input; just no options to choose from.
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("reflects a controlled value prop in the input", () => {
    renderWithMantine(<AssetLocationSelect value="60003760" />);
    // Controlled value -> input shows the matching option's label.
    expect(screen.getByRole("combobox")).toHaveValue(
      "Jita IV - Moon 4 - Caldari Navy (station)",
    );
  });
});
