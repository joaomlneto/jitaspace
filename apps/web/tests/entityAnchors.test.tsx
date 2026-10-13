import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import { AllianceAnchor } from "~/components/Anchor/AllianceAnchor";
import { CategoryAnchor } from "~/components/Anchor/CategoryAnchor";
import { CharacterAnchor } from "~/components/Anchor/CharacterAnchor";
import { ConstellationAnchor } from "~/components/Anchor/ConstellationAnchor";
import { CorporationAnchor } from "~/components/Anchor/CorporationAnchor";
import { DogmaAttributeAnchor } from "~/components/Anchor/DogmaAttributeAnchor";
import { DogmaEffectAnchor } from "~/components/Anchor/DogmaEffectAnchor";
import { EveEntityAnchor } from "~/components/Anchor/EveEntityAnchor";
import { EveEntityNameAnchor } from "~/components/Anchor/EveEntityNameAnchor";
import { EveMailSenderAnchor } from "~/components/Anchor/EveMailSenderAnchor";
import { FactionAnchor } from "~/components/Anchor/FactionAnchor";
import { GroupAnchor } from "~/components/Anchor/GroupAnchor";
import { MarketGroupAnchor } from "~/components/Anchor/MarketGroupAnchor";
import { RegionAnchor } from "~/components/Anchor/RegionAnchor";
import { SolarSystemAnchor } from "~/components/Anchor/SolarSystemAnchor";
import { StarAnchor } from "~/components/Anchor/StarAnchor";
import { StargateDestinationAnchorDisplay } from "~/components/Anchor/StargateDestinationAnchorDisplay";
import { StationAnchor } from "~/components/Anchor/StationAnchor";
import { TypeAnchor } from "~/components/Anchor/TypeAnchor";
import { WarAggressorAnchorDisplay } from "~/components/Anchor/WarAggressorAnchorDisplay";
import { WarAnchor } from "~/components/Anchor/WarAnchor";
import { WarDefenderAnchorDisplay } from "~/components/Anchor/WarDefenderAnchorDisplay";

// EveEntityAnchor (and everything that delegates to it) calls useEsiName to
// resolve an entity category. We echo the category hint back so each anchor
// exercises its own branch in the EveEntityAnchor href switch. When no hint is
// given we still return a category so a real href (none otherwise) is built.
jest.mock("@jitaspace/hooks", () => ({
  useEsiName: (_id?: string | number, categoryHint?: string) => ({
    name: "Resolved Name",
    category: categoryHint ?? "character",
    loading: false,
  }),
}));

// EveEntityNameAnchor renders the name with @jitaspace/eve-components'
// EveEntityName, which the shared stub renders as nothing. Stand in for it with
// the name the mocked hook resolves.
jest.mock("@jitaspace/eve-components", () => ({
  EveEntityName: () => <span>Resolved Name</span>,
}));

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const hrefOf = (text: string) =>
  screen.getByText(text).closest("a")?.getAttribute("href");

// Without a destination an anchor still renders its children inside an <a>, so
// the row keeps its styling, but the <a> carries no href: "#" would point at,
// and on hover prefetch, the current page.
const expectUnlinked = (text: string) => {
  const anchor = screen.getByText(text).closest("a");
  expect(anchor).not.toBeNull();
  expect(anchor).not.toHaveAttribute("href");
};

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
    ["WarAnchor", <WarAnchor warId={123}>War</WarAnchor>, "War", "/war/123"],
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
    ["TypeAnchor", <TypeAnchor typeId={7}>Type</TypeAnchor>, "Type", "/type/7"],
    [
      "StargateDestinationAnchorDisplay",
      <StargateDestinationAnchorDisplay destinationSystemId={8}>
        Dest
      </StargateDestinationAnchorDisplay>,
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

    it("renders unlinked for an unroutable category", () => {
      renderWithMantine(
        <EveEntityAnchor entityId={13} category={"war" as never}>
          Unknown
        </EveEntityAnchor>,
      );
      expectUnlinked("Unknown");
    });

    it("renders unlinked when no entityId is provided", () => {
      renderWithMantine(
        <EveEntityAnchor category="character">NoId</EveEntityAnchor>,
      );
      expectUnlinked("NoId");
    });

    it("renders its children unlinked with a null entityId", () => {
      renderWithMantine(
        <EveEntityAnchor entityId={null} category="character">
          NullId
        </EveEntityAnchor>,
      );
      expectUnlinked("NullId");
    });

    it("keeps the next/link prefetch prop out of the DOM when unlinked", () => {
      // A string value, because React drops a boolean one from an unknown
      // attribute by itself, which would let this pass without the fix.
      renderWithMantine(
        <EveEntityAnchor category="character" prefetch="auto">
          NoIdPrefetch
        </EveEntityAnchor>,
      );
      expect(screen.getByText("NoIdPrefetch").closest("a")).not.toHaveAttribute(
        "prefetch",
      );
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

  describe("WarAggressorAnchorDisplay", () => {
    it("links to the alliance when an aggressor alliance id is given", () => {
      renderWithMantine(
        <WarAggressorAnchorDisplay aggressorAllianceId={111}>
          Aggressor Alliance
        </WarAggressorAnchorDisplay>,
      );
      expect(hrefOf("Aggressor Alliance")).toBe("/alliance/111");
    });

    it("links to the corporation when only a corporation id is given", () => {
      renderWithMantine(
        <WarAggressorAnchorDisplay aggressorCorporationId={222}>
          Aggressor Corp
        </WarAggressorAnchorDisplay>,
      );
      expect(hrefOf("Aggressor Corp")).toBe("/corporation/222");
    });

    it("falls back to EveEntityAnchor when no ids are given", () => {
      renderWithMantine(
        <WarAggressorAnchorDisplay>
          Aggressor Unknown
        </WarAggressorAnchorDisplay>,
      );
      // EveEntityAnchor with no entityId renders unlinked.
      expectUnlinked("Aggressor Unknown");
    });
  });

  describe("WarDefenderAnchorDisplay", () => {
    it("links to the alliance when a defender alliance id is given", () => {
      renderWithMantine(
        <WarDefenderAnchorDisplay defenderAllianceId={333}>
          Defender Alliance
        </WarDefenderAnchorDisplay>,
      );
      expect(hrefOf("Defender Alliance")).toBe("/alliance/333");
    });

    it("links to the corporation when only a corporation id is given", () => {
      renderWithMantine(
        <WarDefenderAnchorDisplay defenderCorporationId={444}>
          Defender Corp
        </WarDefenderAnchorDisplay>,
      );
      expect(hrefOf("Defender Corp")).toBe("/corporation/444");
    });

    it("falls back to EveEntityAnchor when no ids are given", () => {
      renderWithMantine(
        <WarDefenderAnchorDisplay>Defender Unknown</WarDefenderAnchorDisplay>,
      );
      expectUnlinked("Defender Unknown");
    });
  });
});
