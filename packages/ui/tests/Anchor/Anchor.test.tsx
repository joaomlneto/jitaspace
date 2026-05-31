import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// EveEntityAnchor (and everything that delegates to it) calls useEsiName to
// resolve an entity category. We echo the category hint back so each anchor
// exercises its own branch in the EveEntityAnchor href switch. When no hint is
// given we still return a category so a real href ("#" otherwise) is built.
jest.mock("@jitaspace/hooks", () => ({
  useEsiName: (_id?: string | number, categoryHint?: string) => ({
    name: "Resolved Name",
    category: categoryHint ?? "character",
    loading: false,
  }),
}));

import { AllianceAnchor } from "../../Anchor/AllianceAnchor";
import { CalendarEventOwnerAnchor } from "../../Anchor/CalendarEventOwnerAnchor";
import { CategoryAnchor } from "../../Anchor/CategoryAnchor";
import { CharacterAnchor } from "../../Anchor/CharacterAnchor";
import { ConstellationAnchor } from "../../Anchor/ConstellationAnchor";
import { CorporationAnchor } from "../../Anchor/CorporationAnchor";
import { DogmaAttributeAnchor } from "../../Anchor/DogmaAttributeAnchor";
import { DogmaEffectAnchor } from "../../Anchor/DogmaEffectAnchor";
import { EveEntityAnchor } from "../../Anchor/EveEntityAnchor";
import { EveEntityNameAnchor } from "../../Anchor/EveEntityNameAnchor";
import { EveMailSenderAnchor } from "../../Anchor/EveMailSenderAnchor";
import { FactionAnchor } from "../../Anchor/FactionAnchor";
import { GroupAnchor } from "../../Anchor/GroupAnchor";
import { MarketGroupAnchor } from "../../Anchor/MarketGroupAnchor";
import { OpenInformationWindowAnchor } from "../../Anchor/OpenInformationWindowAnchor";
import { RegionAnchor } from "../../Anchor/RegionAnchor";
import { SolarSystemAnchor } from "../../Anchor/SolarSystemAnchor";
import { StarAnchor } from "../../Anchor/StarAnchor";
import { StargateDestinationAnchor } from "../../Anchor/StargateDestinationAnchor";
import { StationAnchor } from "../../Anchor/StationAnchor";
import { TypeAnchor } from "../../Anchor/TypeAnchor";
import { WarAggressorAnchor } from "../../Anchor/WarAggressorAnchor";
import { WarAnchor } from "../../Anchor/WarAnchor";
import { WarDefenderAnchor } from "../../Anchor/WarDefenderAnchor";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const hrefOf = (text: string) =>
  screen.getByText(text).closest("a")?.getAttribute("href");

describe("Anchor components", () => {
  // Every anchor receives an id and some children text. We assert the children
  // render and that an anchor element with an href is produced. The expected
  // href encodes the route each component is responsible for building.
  it.each<[string, ReactElement, string, string]>([
    [
      "AllianceAnchor",
      <AllianceAnchor allianceId={99}>Goonswarm</AllianceAnchor>,
      "Goonswarm",
      "/alliance/99",
    ],
    [
      "CorporationAnchor",
      <CorporationAnchor corporationId={98}>Corp</CorporationAnchor>,
      "Corp",
      // The source builds "/corporation/98/" but next/link normalizes away the
      // trailing slash; assert the actually-rendered href.
      "/corporation/98",
    ],
    [
      "CategoryAnchor",
      <CategoryAnchor categoryId={6}>Ships</CategoryAnchor>,
      "Ships",
      "/category/6",
    ],
    [
      "DogmaAttributeAnchor",
      <DogmaAttributeAnchor attributeId={4}>Mass</DogmaAttributeAnchor>,
      "Mass",
      "/dogma/attribute/4",
    ],
    [
      "DogmaEffectAnchor",
      <DogmaEffectAnchor effectId={11}>Effect</DogmaEffectAnchor>,
      "Effect",
      "/dogma/effect/11",
    ],
    [
      "GroupAnchor",
      <GroupAnchor groupId={25}>Frigate</GroupAnchor>,
      "Frigate",
      "/group/25",
    ],
    [
      "MarketGroupAnchor",
      <MarketGroupAnchor marketGroupId={5}>Market</MarketGroupAnchor>,
      "Market",
      "/market-group/5",
    ],
    [
      "StarAnchor",
      <StarAnchor starId={40000001}>Star</StarAnchor>,
      "Star",
      "/star/40000001",
    ],
    [
      "WarAnchor",
      <WarAnchor warId={123}>War</WarAnchor>,
      "War",
      "/war/123",
    ],
    // The following delegate to EveEntityAnchor; the mocked hook echoes the
    // category hint so each builds its own href.
    [
      "CharacterAnchor",
      <CharacterAnchor characterId={1}>Pilot</CharacterAnchor>,
      "Pilot",
      "/character/1",
    ],
    [
      "ConstellationAnchor",
      <ConstellationAnchor constellationId={2}>Const</ConstellationAnchor>,
      "Const",
      "/constellation/2",
    ],
    [
      "FactionAnchor",
      <FactionAnchor factionId={3}>Faction</FactionAnchor>,
      "Faction",
      "/faction/3",
    ],
    [
      "RegionAnchor",
      <RegionAnchor regionId={4}>Region</RegionAnchor>,
      "Region",
      "/region/4",
    ],
    [
      "SolarSystemAnchor",
      <SolarSystemAnchor solarSystemId={5}>System</SolarSystemAnchor>,
      "System",
      "/system/5",
    ],
    [
      "StationAnchor",
      <StationAnchor stationId={6}>Station</StationAnchor>,
      "Station",
      "/station/6",
    ],
    [
      "TypeAnchor",
      <TypeAnchor typeId={7}>Type</TypeAnchor>,
      "Type",
      "/type/7",
    ],
    [
      "StargateDestinationAnchor",
      <StargateDestinationAnchor destinationSystemId={8}>Dest</StargateDestinationAnchor>,
      "Dest",
      "/system/8",
    ],
  ])("%s renders an anchor to %s", (_label, element, text, href) => {
    renderWithMantine(element);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(hrefOf(text)).toBe(href);
  });

  describe("EveEntityNameAnchor", () => {
    it("renders the resolved entity name inside a category-routed anchor", () => {
      renderWithMantine(
        <EveEntityNameAnchor entityId={55} category="character" />,
      );
      const node = screen.getByText("Resolved Name");
      expect(node).toBeInTheDocument();
      expect(node.closest("a")?.getAttribute("href")).toBe("/character/55");
    });
  });

  describe("EveEntityAnchor href branches", () => {
    it.each<[string, string]>([
      ["agent", "/character/13"],
      ["alliance", "/alliance/13"],
      ["character", "/character/13"],
      ["constellation", "/constellation/13"],
      ["corporation", "/corporation/13"],
      ["faction", "/faction/13"],
      ["region", "/region/13"],
      ["station", "/station/13"],
      ["structure", "/structure/13"],
      ["inventory_type", "/type/13"],
      ["solar_system", "/system/13"],
    ])("maps category %s to %s", (category, href) => {
      renderWithMantine(
        <EveEntityAnchor entityId={13} category={category as never}>
          Entity
        </EveEntityAnchor>,
      );
      expect(hrefOf("Entity")).toBe(href);
    });

    it("falls back to '#' for an unknown category", () => {
      renderWithMantine(
        <EveEntityAnchor entityId={13} category={"war" as never}>
          Unknown
        </EveEntityAnchor>,
      );
      expect(hrefOf("Unknown")).toBe("#");
    });

    it("falls back to '#' when no entityId is provided", () => {
      renderWithMantine(
        <EveEntityAnchor category="character">NoId</EveEntityAnchor>,
      );
      expect(hrefOf("NoId")).toBe("#");
    });

    it("renders children even with a null entityId", () => {
      renderWithMantine(
        <EveEntityAnchor entityId={null} category="character">
          NullId
        </EveEntityAnchor>,
      );
      expect(screen.getByText("NullId")).toBeInTheDocument();
    });
  });

  describe("CategoryAnchor / MarketGroupAnchor / GroupAnchor undefined id", () => {
    it("CategoryAnchor renders bare children when categoryId is undefined", () => {
      renderWithMantine(<CategoryAnchor>Bare Category</CategoryAnchor>);
      const node = screen.getByText("Bare Category");
      expect(node).toBeInTheDocument();
      expect(node.closest("a")).toBeNull();
    });

    it("GroupAnchor renders bare children when groupId is undefined", () => {
      renderWithMantine(<GroupAnchor>Bare Group</GroupAnchor>);
      const node = screen.getByText("Bare Group");
      expect(node).toBeInTheDocument();
      expect(node.closest("a")).toBeNull();
    });

    it("MarketGroupAnchor renders bare children when marketGroupId is undefined", () => {
      renderWithMantine(<MarketGroupAnchor>Bare Market</MarketGroupAnchor>);
      const node = screen.getByText("Bare Market");
      expect(node).toBeInTheDocument();
      expect(node.closest("a")).toBeNull();
    });
  });

  describe("CalendarEventOwnerAnchor", () => {
    it("renders bare children for the eve_server owner type", () => {
      renderWithMantine(
        <CalendarEventOwnerAnchor ownerType="eve_server">
          EVE System
        </CalendarEventOwnerAnchor>,
      );
      const node = screen.getByText("EVE System");
      expect(node).toBeInTheDocument();
      expect(node.closest("a")).toBeNull();
    });

    it("delegates to EveEntityAnchor for a normal owner", () => {
      renderWithMantine(
        <CalendarEventOwnerAnchor ownerId={42} ownerType="character">
          Owner
        </CalendarEventOwnerAnchor>,
      );
      expect(hrefOf("Owner")).toBe("/character/42");
    });
  });

  describe("EveMailSenderAnchor", () => {
    it("renders a plain anchor when the sender is a mailing list", () => {
      renderWithMantine(
        <EveMailSenderAnchor
          from={7}
          mailingLists={[{ mailing_list_id: 7, name: "List" }]}
        >
          Mailing List
        </EveMailSenderAnchor>,
      );
      const node = screen.getByText("Mailing List");
      expect(node).toBeInTheDocument();
      // Plain Anchor without a Link target: no href attribute.
      expect(node.closest("a")?.getAttribute("href")).toBeNull();
    });

    it("delegates to EveEntityAnchor for a regular sender", () => {
      renderWithMantine(
        <EveMailSenderAnchor from={7} mailingLists={[]}>
          Sender
        </EveMailSenderAnchor>,
      );
      // Mocked hook defaults to the "character" category for this id.
      expect(hrefOf("Sender")).toBe("/character/7");
    });
  });

  describe("OpenInformationWindowAnchor", () => {
    it("invokes onOpen when clicked and enabled", () => {
      const onOpen = jest.fn();
      renderWithMantine(
        <OpenInformationWindowAnchor onOpen={onOpen}>
          Open
        </OpenInformationWindowAnchor>,
      );
      screen.getByText("Open").click();
      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it("does not invoke onOpen when disabled", () => {
      const onOpen = jest.fn();
      renderWithMantine(
        <OpenInformationWindowAnchor onOpen={onOpen} disabled>
          Disabled
        </OpenInformationWindowAnchor>,
      );
      screen.getByText("Disabled").click();
      expect(onOpen).not.toHaveBeenCalled();
    });
  });

  describe("WarAggressorAnchor", () => {
    it("links to the alliance when an aggressor alliance id is given", () => {
      renderWithMantine(
        <WarAggressorAnchor aggressorAllianceId={111}>
          Aggressor Alliance
        </WarAggressorAnchor>,
      );
      expect(hrefOf("Aggressor Alliance")).toBe("/alliance/111");
    });

    it("links to the corporation when only a corporation id is given", () => {
      renderWithMantine(
        <WarAggressorAnchor aggressorCorporationId={222}>
          Aggressor Corp
        </WarAggressorAnchor>,
      );
      expect(hrefOf("Aggressor Corp")).toBe("/corporation/222");
    });

    it("falls back to EveEntityAnchor when no ids are given", () => {
      renderWithMantine(
        <WarAggressorAnchor>Aggressor Unknown</WarAggressorAnchor>,
      );
      // EveEntityAnchor with no entityId resolves to '#'.
      expect(hrefOf("Aggressor Unknown")).toBe("#");
    });
  });

  describe("WarDefenderAnchor", () => {
    it("links to the alliance when a defender alliance id is given", () => {
      renderWithMantine(
        <WarDefenderAnchor defenderAllianceId={333}>
          Defender Alliance
        </WarDefenderAnchor>,
      );
      expect(hrefOf("Defender Alliance")).toBe("/alliance/333");
    });

    it("links to the corporation when only a corporation id is given", () => {
      renderWithMantine(
        <WarDefenderAnchor defenderCorporationId={444}>
          Defender Corp
        </WarDefenderAnchor>,
      );
      expect(hrefOf("Defender Corp")).toBe("/corporation/444");
    });

    it("falls back to EveEntityAnchor when no ids are given", () => {
      renderWithMantine(
        <WarDefenderAnchor>Defender Unknown</WarDefenderAnchor>,
      );
      expect(hrefOf("Defender Unknown")).toBe("#");
    });
  });
});
