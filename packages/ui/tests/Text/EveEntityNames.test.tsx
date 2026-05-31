import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// Resolve every entity name to a known value so we can assert the components
// forward their id/category into EveEntityName and render the resolved text.
jest.mock("@jitaspace/hooks", () => ({
  useEsiName: () => ({ name: "Resolved Name", loading: false }),
}));

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
    ["StructureName", <StructureName structureId={1} />],
    ["TypeName", <TypeName typeId={1} />],
  ])("%s renders the resolved entity name", (_label, element) => {
    renderWithMantine(element);
    expect(screen.getByText("Resolved Name")).toBeInTheDocument();
  });
});
