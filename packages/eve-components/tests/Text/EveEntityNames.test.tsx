import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { beforeEach, describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import { AllianceName } from "../../Text/AllianceName";
import { CharacterName } from "../../Text/CharacterName";
import { ConstellationName } from "../../Text/ConstellationName";
import { CorporationName } from "../../Text/CorporationName";
import { FactionName } from "../../Text/FactionName";
import { RegionName } from "../../Text/RegionName";
import { SolarSystemName } from "../../Text/SolarSystemName";
import { StationName } from "../../Text/StationName";
import { StructureName } from "../../Text/StructureName";
import { TypeName } from "../../Text/TypeName";

// Resolve every entity name to a known value so we can assert the components
// forward their id/category into EveEntityName and render the resolved text.
const mockUseEsiName = jest.fn((..._args: unknown[]) => ({
  name: "Resolved Name",
  loading: false,
}));
const mockUseStructure = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useEsiName: (...args: unknown[]) => mockUseEsiName(...args),
  useStructure: (...args: unknown[]) => mockUseStructure(...args),
}));

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("EveEntity name components", () => {
  it.each<[string, ReactElement]>([
    ["AllianceName", <AllianceName allianceId={1} />],
    ["CharacterName", <CharacterName characterId={1} />],
    ["ConstellationName", <ConstellationName constellationId={1} />],
    ["CorporationName", <CorporationName corporationId={1} />],
    ["FactionName", <FactionName factionId={1} />],
    ["RegionName", <RegionName regionId={1} />],
    ["SolarSystemName", <SolarSystemName solarSystemId={1} />],
    ["StationName", <StationName stationId={1} />],
    ["TypeName", <TypeName typeId={1} />],
  ])("%s renders the resolved entity name", (_label, element) => {
    renderWithMantine(element);
    expect(screen.getByText("Resolved Name")).toBeInTheDocument();
  });
});

// StructureName deliberately does NOT go through useEsiName: structure names
// need a signed request, and the shared name cache resolves without a token,
// so every structure rendered "Unknown".
describe("StructureName", () => {
  beforeEach(() => {
    mockUseEsiName.mockClear();
    mockUseStructure.mockReset();
  });

  it("renders the name from the signed structure lookup", () => {
    mockUseStructure.mockReturnValue({
      data: { data: { name: "Jita IV - Moon 4 - Keepstar" } },
      isLoading: false,
    });

    renderWithMantine(<StructureName structureId="1035466617946" />);

    expect(screen.getByText("Jita IV - Moon 4 - Keepstar")).toBeInTheDocument();
    expect(mockUseStructure).toHaveBeenCalledWith(1035466617946);
    expect(mockUseEsiName).not.toHaveBeenCalled();
  });

  it("shows a placeholder while the lookup is in flight", () => {
    mockUseStructure.mockReturnValue({ data: undefined, isLoading: true });

    const { container } = renderWithMantine(
      <StructureName structureId={1035466617946} />,
    );

    // A skeleton, not "Unknown": an in-flight lookup must not read as a
    // structure nobody can name.
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
    expect(container.querySelector(".mantine-Skeleton-root")).not.toBeNull();
  });

  it("does not look anything up without an id", () => {
    mockUseStructure.mockReturnValue({ data: undefined, isLoading: false });

    renderWithMantine(<StructureName />);

    expect(mockUseStructure).toHaveBeenCalledWith(0);
  });
});
