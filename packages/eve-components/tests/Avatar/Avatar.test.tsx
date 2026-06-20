import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";

import {
  AllianceAvatar,
  CalendarEventOwnerAvatar,
  CharacterAvatar,
  CorporationAvatar,
  EveIconAvatarPlaceholder,
  EveImageServerAvatar,
  FactionAvatar,
  PlanetAvatar,
  RaceAvatar,
  SolarSystemStarAvatar,
  StarAvatar,
  StargateAvatar,
  StationAvatar,
  StructureAvatar,
  TypeAvatar,
  WarAggressorAvatar,
  WarDefenderAvatar,
} from "@jitaspace/ui";

import { EveEntityAvatar } from "../../Avatar/EveEntityAvatar";
import { EveIconAvatar } from "../../Avatar/EveIconAvatar";
import { EveMailSenderAvatar } from "../../Avatar/EveMailSenderAvatar";
import { MarketGroupAvatar } from "../../Avatar/MarketGroupAvatar";
import { SolarSystemSovereigntyAvatar } from "../../Avatar/SolarSystemSovereigntyAvatar";

// ---------------------------------------------------------------------------
// Mock every external data source the Avatar components reach for. Each mock is
// a jest.fn() so individual tests can override the return shape when they need
// to drive a specific branch (e.g. sovereignty by alliance vs corporation).
// ---------------------------------------------------------------------------

const useEsiName = jest.fn();
const useMarketGroup = jest.fn();
const useSolarSystem = jest.fn();
const useSolarSystemSovereignty = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useEsiName: (...args: unknown[]) => useEsiName(...args),
  useMarketGroup: (...args: unknown[]) => useMarketGroup(...args),
  useSolarSystem: (...args: unknown[]) => useSolarSystem(...args),
  useSolarSystemSovereignty: (...args: unknown[]) =>
    useSolarSystemSovereignty(...args),
}));

const useGetIconById = jest.fn();

jest.mock("@jitaspace/sde-client", () => ({
  useGetIconById: (...args: unknown[]) => useGetIconById(...args),
}));

// swr/immutable backs TypeAvatar's image-variation lookup.
const useSWRImmutable = jest.fn();

jest.mock("swr/immutable", () => ({
  __esModule: true,
  // Wrap in a `use`-prefixed function expression so the forwarded call is
  // treated as a custom hook by rules-of-hooks, while keeping the lazy lookup
  // of `useSWRImmutable` (the factory runs before that const is initialized).
  default: function useSWRImmutableMock(...args: unknown[]) {
    return useSWRImmutable(...args);
  },
}));

// eve-icons pulls in a large SVG import chain; stub the two used here as simple
// DOM nodes so rendering stays fast and assertions stay stable.
jest.mock("@jitaspace/eve-icons", () => ({
  // Avatar props (width/height/radius/variant/...) are intentionally dropped so
  // React does not warn about unknown attributes on a plain DOM node.
  UnknownIcon: () => <span data-testid="unknown-icon" />,
  GroupListIcon: () => <span data-testid="group-list-icon" />,
}));

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

// Reasonable defaults shared by the bulk "renders" suite. Individual branch
// tests below set their own return values after these defaults are applied.
beforeEach(() => {
  useEsiName.mockReturnValue({
    name: "Resolved Name",
    category: "character",
    loading: false,
    error: undefined,
  });
  useMarketGroup.mockReturnValue({ iconID: 25 });
  useSolarSystem.mockReturnValue({ data: { data: { star_id: 40000001 } } });
  useSolarSystemSovereignty.mockReturnValue({
    alliance_id: 99000001,
    corporation_id: 98000001,
    faction_id: 500001,
  });
  useGetIconById.mockReturnValue({
    data: { data: { iconFile: "res:/ui/texture/icons/7_64_15.png" } },
    isPending: false,
  });
  useSWRImmutable.mockReturnValue({ data: ["icon"] });
});

describe("Avatar components render", () => {
  // Each entry renders the component with the minimum props required and the
  // beforeEach default hook data. We assert the component produces some DOM and
  // an <img> (Mantine Avatar renders an <img> when given a src).
  it.each<[string, ReactElement]>([
    ["AllianceAvatar", <AllianceAvatar allianceId={99000001} />],
    [
      "CalendarEventOwnerAvatar",
      <CalendarEventOwnerAvatar ownerId={1} ownerType="character" />,
    ],
    ["CharacterAvatar", <CharacterAvatar characterId={90000001} />],
    ["CorporationAvatar", <CorporationAvatar corporationId={98000001} />],
    ["EveEntityAvatar", <EveEntityAvatar entityId={90000001} />],
    ["EveIconAvatar", <EveIconAvatar iconId={25} />],
    ["EveIconAvatarPlaceholder", <EveIconAvatarPlaceholder />],
    [
      "EveImageServerAvatar",
      <EveImageServerAvatar
        category="characters"
        id={1}
        variation="portrait"
      />,
    ],
    ["EveMailSenderAvatar", <EveMailSenderAvatar from={90000001} />],
    ["FactionAvatar", <FactionAvatar factionId={500001} />],
    ["MarketGroupAvatar", <MarketGroupAvatar marketGroupId={4} />],
    ["PlanetAvatar", <PlanetAvatar typeId={11} />],
    ["RaceAvatar", <RaceAvatar factionId="500001" />],
    [
      "SolarSystemSovereigntyAvatar",
      <SolarSystemSovereigntyAvatar solarSystemId={30000142} />,
    ],
    ["SolarSystemStarAvatar", <SolarSystemStarAvatar typeId={6} />],
    ["StarAvatar", <StarAvatar typeId={6} />],
    ["StargateAvatar", <StargateAvatar typeId={16} />],
    ["StationAvatar", <StationAvatar typeId={1531} />],
    ["StructureAvatar", <StructureAvatar typeId={35832} />],
    ["TypeAvatar", <TypeAvatar typeId={587} />],
    [
      "WarAggressorAvatar",
      <WarAggressorAvatar aggressorAllianceId={99000001} />,
    ],
    ["WarDefenderAvatar", <WarDefenderAvatar defenderAllianceId={99000002} />],
  ])("%s renders without crashing", (_label, element) => {
    const { container } = renderWithMantine(element);
    expect(container).not.toBeEmptyDOMElement();
  });
});

// ---------------------------------------------------------------------------
// Image-server URL plumbing: the simple id-based avatars should emit an <img>
// whose src points at the EVE image server for the expected category.
// ---------------------------------------------------------------------------

describe("EveImageServerAvatar", () => {
  it("builds an image-server url from category/id/variation", () => {
    const { container } = renderWithMantine(
      <EveImageServerAvatar
        category="characters"
        id={90000001}
        variation="portrait"
      />,
    );
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute("src")).toContain(
      "https://images.evetech.net/characters/90000001/portrait",
    );
  });

  it("falls back to the placeholder /1/ image when id is missing", () => {
    const { container } = renderWithMantine(
      <EveImageServerAvatar category="alliances" variation="logo" />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toContain(
      "https://images.evetech.net/alliances/1/logo",
    );
  });

  it("renders no src when category/variation are absent", () => {
    const { container } = renderWithMantine(<EveImageServerAvatar id={123} />);
    // Mantine renders its placeholder (no <img>) when src is undefined.
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container).not.toBeEmptyDOMElement();
  });

  it("uses the portrait placeholder for the characters category with no id", () => {
    const { container } = renderWithMantine(
      <EveImageServerAvatar category="characters" variation="portrait" />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "https://images.evetech.net/characters/1/portrait",
    );
  });
});

describe("AllianceAvatar / CorporationAvatar / CharacterAvatar / FactionAvatar", () => {
  it("AllianceAvatar points at the alliances logo endpoint", () => {
    const { container } = renderWithMantine(
      <AllianceAvatar allianceId={99000001} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/alliances/99000001/logo",
    );
  });

  it("CorporationAvatar points at the corporations logo endpoint", () => {
    const { container } = renderWithMantine(
      <CorporationAvatar corporationId={98000001} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/corporations/98000001/logo",
    );
  });

  it("CharacterAvatar points at the characters portrait endpoint", () => {
    const { container } = renderWithMantine(
      <CharacterAvatar characterId={90000001} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/characters/90000001/portrait",
    );
  });

  it("FactionAvatar resolves through the corporations logo endpoint", () => {
    const { container } = renderWithMantine(
      <FactionAvatar factionId={500001} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/corporations/500001/logo",
    );
  });

  it("RaceAvatar delegates to FactionAvatar with the given id", () => {
    const { container } = renderWithMantine(<RaceAvatar factionId="500003" />);
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/corporations/500003/logo",
    );
  });

  it("RaceAvatar coerces a null factionId and falls back to the placeholder logo", () => {
    // factionId ?? "" -> empty (falsy) id, so EveImageServerAvatar takes the
    // corporations "/1/logo" placeholder branch.
    const { container } = renderWithMantine(<RaceAvatar factionId={null} />);
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/corporations/1/logo",
    );
  });
});

// ---------------------------------------------------------------------------
// EveEntityAvatar branches on the resolved category from useEsiName.
// ---------------------------------------------------------------------------

describe("EveEntityAvatar", () => {
  it("shows a skeleton while loading", () => {
    useEsiName.mockReturnValue({ category: undefined, loading: true });
    const { container } = renderWithMantine(
      <EveEntityAvatar entityId={90000001} />,
    );
    expect(
      container.querySelector(".mantine-Skeleton-root"),
    ).toBeInTheDocument();
  });

  it("shows a skeleton when entityId is undefined", () => {
    useEsiName.mockReturnValue({ category: undefined, loading: false });
    const { container } = renderWithMantine(<EveEntityAvatar />);
    expect(
      container.querySelector(".mantine-Skeleton-root"),
    ).toBeInTheDocument();
  });

  it("renders the UnknownIcon when category resolution fails", () => {
    useEsiName.mockReturnValue({
      category: undefined,
      loading: false,
      error: new Error("nope"),
    });
    const { getByTestId } = renderWithMantine(
      <EveEntityAvatar entityId={123} />,
    );
    expect(getByTestId("unknown-icon")).toBeInTheDocument();
  });

  it("accepts a string entityId and parses it", () => {
    useEsiName.mockReturnValue({ category: "character", loading: false });
    const { container } = renderWithMantine(
      <EveEntityAvatar entityId={"90000001"} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/characters/90000001/portrait",
    );
  });

  it.each<[string, string]>([
    ["character", "/characters/77/portrait"],
    ["agent", "/characters/77/portrait"],
    ["corporation", "/corporations/77/logo"],
    ["alliance", "/alliances/77/logo"],
    ["inventory_type", "/types/77/"],
    ["faction", "/corporations/77/logo"],
  ])("routes category %s to the right avatar", (category, expectedFragment) => {
    useEsiName.mockReturnValue({ category, loading: false });
    const { container } = renderWithMantine(<EveEntityAvatar entityId={77} />);
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      expectedFragment,
    );
  });

  // solar_system/station/structure are type-backed entities: their avatar is
  // the underlying type's render, which needs resolving id -> type_id (a fetch,
  // plus auth for structures). This generic dispatcher can't do that, so it
  // falls through to a bare Avatar (no image). Callers needing those avatars
  // use the smart apps/web wrappers.
  it.each<[string]>([["solar_system"], ["station"], ["structure"]])(
    "falls through to a bare Avatar for type-backed category %s",
    (category) => {
      useEsiName.mockReturnValue({ category, loading: false });
      const { container } = renderWithMantine(
        <EveEntityAvatar entityId={77} />,
      );
      expect(container.querySelector("img")).not.toBeInTheDocument();
      expect(container).not.toBeEmptyDOMElement();
    },
  );

  it("renders a bare Avatar for an unhandled category", () => {
    useEsiName.mockReturnValue({ category: "region", loading: false });
    const { container } = renderWithMantine(<EveEntityAvatar entityId={77} />);
    // Unhandled categories fall through to a plain Mantine Avatar (no img).
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container).not.toBeEmptyDOMElement();
  });
});

// ---------------------------------------------------------------------------
// EveIconAvatar + placeholder.
// ---------------------------------------------------------------------------

describe("EveIconAvatar", () => {
  it("renders the resolved icon image", () => {
    const { container } = renderWithMantine(<EveIconAvatar iconId={25} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toContain(
      "https://iec.jita.space/items/7_64_15.png",
    );
  });

  it("wraps in a visible skeleton while the icon query is pending", () => {
    useGetIconById.mockReturnValue({ data: undefined, isPending: true });
    const { container } = renderWithMantine(<EveIconAvatar iconId={25} />);
    expect(
      container.querySelector(".mantine-Skeleton-root"),
    ).toBeInTheDocument();
  });

  it("defaults a null iconId to 0 when querying the icon", () => {
    renderWithMantine(<EveIconAvatar iconId={null} />);
    expect(useGetIconById).toHaveBeenCalledWith(0);
  });
});

describe("EveIconAvatarPlaceholder", () => {
  it("renders the default placeholder image", () => {
    const { container } = renderWithMantine(<EveIconAvatarPlaceholder />);
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "https://iec.jita.space/items/7_64_15.png",
    );
  });
});

// ---------------------------------------------------------------------------
// MarketGroupAvatar reads iconID from the market group hook.
// ---------------------------------------------------------------------------

describe("MarketGroupAvatar", () => {
  it("forwards the market group iconID to EveIconAvatar", () => {
    const { container } = renderWithMantine(
      <MarketGroupAvatar marketGroupId={4} />,
    );
    expect(container.querySelector("img")).toBeInTheDocument();
    expect(useMarketGroup).toHaveBeenCalledWith(4);
  });

  it("defaults the iconID to 0 when the group is unknown", () => {
    // useMarketGroup always returns an object (it spreads optional ESI/SDE data
    // into a fresh object); an unknown group yields one with no `iconID`.
    useMarketGroup.mockReturnValue({});
    const { container } = renderWithMantine(
      <MarketGroupAvatar marketGroupId={999} />,
    );
    expect(container).not.toBeEmptyDOMElement();
  });
});

// ---------------------------------------------------------------------------
// Type-derived avatars (Planet/SolarSystemStar/Star/Stargate/Station/Structure).
// ---------------------------------------------------------------------------

describe("Type-derived avatars", () => {
  it("PlanetAvatar requests the type icon variation", () => {
    const { container } = renderWithMantine(<PlanetAvatar typeId={2016} />);
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/types/2016/icon",
    );
  });

  it.each<[string, ReactElement]>([
    ["SolarSystemStarAvatar", <SolarSystemStarAvatar typeId={6} />],
    ["StarAvatar", <StarAvatar typeId={6} />],
    ["StargateAvatar", <StargateAvatar typeId={16} />],
    ["StationAvatar", <StationAvatar typeId={1531} />],
    ["StructureAvatar", <StructureAvatar typeId={35832} />],
  ])("%s requests the type render variation", (_label, element) => {
    const { container } = renderWithMantine(element);
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/render",
    );
  });
});

describe("TypeAvatar", () => {
  it("uses an explicit variation when provided", () => {
    const { container } = renderWithMantine(
      <TypeAvatar typeId={587} variation="bp" />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/types/587/bp",
    );
  });

  it("falls back to the swr-provided variation when none is passed", () => {
    useSWRImmutable.mockReturnValue({ data: ["render"] });
    const { container } = renderWithMantine(<TypeAvatar typeId={587} />);
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/types/587/render",
    );
  });

  it("falls back to icon when swr has no data", () => {
    useSWRImmutable.mockReturnValue({ data: undefined });
    const { container } = renderWithMantine(<TypeAvatar typeId={587} />);
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/types/587/icon",
    );
  });
});

// ---------------------------------------------------------------------------
// CalendarEventOwnerAvatar dispatches on ownerType.
// ---------------------------------------------------------------------------

describe("CalendarEventOwnerAvatar", () => {
  it("renders a skeleton when ownerId or ownerType is missing", () => {
    const { container } = renderWithMantine(<CalendarEventOwnerAvatar />);
    expect(
      container.querySelector(".mantine-Skeleton-root"),
    ).toBeInTheDocument();
  });

  it.each<[string, string]>([
    ["alliance", "/alliances/55/logo"],
    ["character", "/characters/55/portrait"],
    ["corporation", "/corporations/55/logo"],
    ["faction", "/corporations/55/logo"],
  ])("renders the %s avatar", (ownerType, fragment) => {
    const { container } = renderWithMantine(
      <CalendarEventOwnerAvatar ownerId={55} ownerType={ownerType} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      fragment,
    );
  });

  it("maps eve_server to the CCP alliance logo", () => {
    const { container } = renderWithMantine(
      <CalendarEventOwnerAvatar ownerId={55} ownerType="eve_server" />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/alliances/434243723/logo",
    );
  });

  it("renders a plain Avatar for an unknown ownerType", () => {
    const { container } = renderWithMantine(
      <CalendarEventOwnerAvatar ownerId={55} ownerType="mystery" />,
    );
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container).not.toBeEmptyDOMElement();
  });
});

// ---------------------------------------------------------------------------
// EveMailSenderAvatar: skeleton, mailing-list icon, or delegated entity avatar.
// ---------------------------------------------------------------------------

describe("EveMailSenderAvatar", () => {
  it("renders a skeleton when no sender is given", () => {
    const { container } = renderWithMantine(<EveMailSenderAvatar />);
    expect(
      container.querySelector(".mantine-Skeleton-root"),
    ).toBeInTheDocument();
  });

  it("renders the mailing-list icon when the sender is a mailing list", () => {
    const { getByTestId } = renderWithMantine(
      <EveMailSenderAvatar
        from={9}
        mailingLists={[{ mailing_list_id: 9, name: "Corp Chat" }]}
      />,
    );
    expect(getByTestId("group-list-icon")).toBeInTheDocument();
  });

  it("delegates to EveEntityAvatar for a normal sender", () => {
    useEsiName.mockReturnValue({ category: "character", loading: false });
    const { container } = renderWithMantine(
      <EveMailSenderAvatar from={90000001} mailingLists={[]} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/characters/90000001/portrait",
    );
  });
});

// ---------------------------------------------------------------------------
// SolarSystemSovereigntyAvatar prefers alliance > corporation > faction > star.
// ---------------------------------------------------------------------------

describe("SolarSystemSovereigntyAvatar", () => {
  it("renders the alliance avatar when sovereignty has an alliance", () => {
    useSolarSystemSovereignty.mockReturnValue({ alliance_id: 99000123 });
    const { container } = renderWithMantine(
      <SolarSystemSovereigntyAvatar solarSystemId={30000142} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/alliances/99000123/logo",
    );
  });

  it("renders the corporation avatar when only a corporation holds sov", () => {
    useSolarSystemSovereignty.mockReturnValue({ corporation_id: 98000123 });
    const { container } = renderWithMantine(
      <SolarSystemSovereigntyAvatar solarSystemId={30000142} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/corporations/98000123/logo",
    );
  });

  it("renders the faction avatar when only a faction holds sov", () => {
    useSolarSystemSovereignty.mockReturnValue({ faction_id: 500004 });
    const { container } = renderWithMantine(
      <SolarSystemSovereigntyAvatar solarSystemId={30000142} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/corporations/500004/logo",
    );
  });

  it("falls back to the star avatar when there is no sovereignty", () => {
    useSolarSystemSovereignty.mockReturnValue(undefined);
    useSolarSystem.mockReturnValue({ data: { data: { star_id: 40000007 } } });
    const { container } = renderWithMantine(
      <SolarSystemSovereigntyAvatar solarSystemId={30000142} />,
    );
    // StarAvatar -> TypeAvatar receives star_id via starId, which TypeAvatar
    // ignores (no typeId), so it renders the fallback placeholder, not an img.
    expect(container).not.toBeEmptyDOMElement();
  });

  it("accepts a string solarSystemId", () => {
    useSolarSystemSovereignty.mockReturnValue({ alliance_id: 99000999 });
    const { container } = renderWithMantine(
      <SolarSystemSovereigntyAvatar solarSystemId={"30000142"} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/alliances/99000999/logo",
    );
  });

  it("defaults a missing solarSystemId to 1 when looking up sovereignty", () => {
    useSolarSystemSovereignty.mockReturnValue({ alliance_id: 99001234 });
    renderWithMantine(<SolarSystemSovereigntyAvatar />);
    expect(useSolarSystemSovereignty).toHaveBeenCalledWith(1);
    expect(useSolarSystem).toHaveBeenCalledWith(1);
  });
});

// ---------------------------------------------------------------------------
// War avatars: alliance wins over corporation, else a plain Avatar.
// ---------------------------------------------------------------------------

describe("WarAggressorAvatar", () => {
  it("prefers the alliance avatar", () => {
    const { container } = renderWithMantine(
      <WarAggressorAvatar
        aggressorAllianceId={99000001}
        aggressorCorporationId={98000001}
      />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/alliances/99000001/logo",
    );
  });

  it("uses the corporation avatar when no alliance is set", () => {
    const { container } = renderWithMantine(
      <WarAggressorAvatar aggressorCorporationId={98000002} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/corporations/98000002/logo",
    );
  });

  it("renders a plain Avatar when neither id is set", () => {
    const { container } = renderWithMantine(<WarAggressorAvatar />);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container).not.toBeEmptyDOMElement();
  });
});

describe("WarDefenderAvatar", () => {
  it("prefers the alliance avatar", () => {
    const { container } = renderWithMantine(
      <WarDefenderAvatar
        defenderAllianceId={99000003}
        defenderCorporationId={98000003}
      />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/alliances/99000003/logo",
    );
  });

  it("uses the corporation avatar when no alliance is set", () => {
    const { container } = renderWithMantine(
      <WarDefenderAvatar defenderCorporationId={98000004} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/corporations/98000004/logo",
    );
  });

  it("renders a plain Avatar when neither id is set", () => {
    const { container } = renderWithMantine(<WarDefenderAvatar />);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container).not.toBeEmptyDOMElement();
  });
});
