import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
// NOTE: `jest` is intentionally NOT imported from "@jest/globals" here. The
// @swc/jest mock-hoisting only recognises the ambient global `jest`; importing
// it as a local binding stops jest.mock from being hoisted above the component
// imports, which then load the real (ESM-only) "@jitaspace/hooks" module.
import { beforeEach, describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import {
  AsteroidBeltName,
  BloodlineName,
  CalendarEventOwnerName,
  CategoryName,
  CSPACostText,
  DogmaAttributeName,
  DogmaEffectName,
  GroupName,
  ISKAmount,
  LabelName,
  MailingListName,
  MarketGroupName,
  MoonName,
  PlanetName,
  Position3DText,
  RaceName,
  StargateName,
  StarName,
} from "@jitaspace/ui";

import { AssetLocationName } from "../../Text/AssetLocationName";
import { EveMailSenderName } from "../../Text/EveMailSenderName";
import { WarAggressorName } from "../../Text/WarAggressorName";
import { WarDefenderName } from "../../Text/WarDefenderName";

// The Text components in this suite read from at most two hooks:
//  - useEsiName: used (directly or via EveEntityName) by the delegating
//    components (EveMailSenderName, War*Name, AssetLocationName station path).
//  - useCharacterAssets: used by AssetLocationName to look up a location by id.
// We stub the whole "@jitaspace/hooks" module so none of its (heavy, ESM-only)
// transitive dependencies load, and every component renders deterministic,
// assertable output. useCharacterAssets reads a `mock`-prefixed module variable
// that each test reassigns to vary the returned asset locations.
let mockLocations: Record<string, unknown> = {};

jest.mock("@jitaspace/hooks", () => ({
  useEsiName: () => ({ name: "Resolved Name", loading: false }),
  useCharacterAssets: () => ({ locations: mockLocations }),
}));

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

beforeEach(() => {
  // Default: no known asset locations.
  mockLocations = {};
});

describe("Name components rendering a plain string prop", () => {
  // Each of these renders the `name`/`ownerName` prop verbatim inside <Text>.
  it.each<[string, ReactElement, string]>([
    ["AsteroidBeltName", <AsteroidBeltName name="Belt I" />, "Belt I"],
    ["BloodlineName", <BloodlineName name="Deteis" />, "Deteis"],
    [
      "CalendarEventOwnerName",
      <CalendarEventOwnerName ownerName="CCP" />,
      "CCP",
    ],
    ["CategoryName", <CategoryName name="Ship" />, "Ship"],
    ["DogmaAttributeName", <DogmaAttributeName name="Armor HP" />, "Armor HP"],
    ["DogmaEffectName", <DogmaEffectName name="loPower" />, "loPower"],
    ["GroupName", <GroupName name="Frigate" />, "Frigate"],
    ["LabelName", <LabelName name="Inbox" />, "Inbox"],
    ["MailingListName", <MailingListName name="Jita Local" />, "Jita Local"],
    ["MarketGroupName", <MarketGroupName name="Ammunition" />, "Ammunition"],
    ["MoonName", <MoonName name="Jita IV - Moon 4" />, "Jita IV - Moon 4"],
    ["PlanetName", <PlanetName name="Jita IV" />, "Jita IV"],
    ["RaceName", <RaceName name="Caldari" />, "Caldari"],
    ["StarName", <StarName name="Jita - Star" />, "Jita - Star"],
    [
      "StargateName",
      <StargateName name="Stargate (Perimeter)" />,
      "Stargate (Perimeter)",
    ],
  ])("%s renders its name prop", (_label, element, expected) => {
    renderWithMantine(element);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});

describe("Name components falling back to a skeleton placeholder", () => {
  // Without a name these render a Mantine Skeleton (no text) inside <Text>.
  it.each<[string, ReactElement]>([
    ["AsteroidBeltName", <AsteroidBeltName data-testid="t" />],
    ["BloodlineName", <BloodlineName data-testid="t" />],
    ["CalendarEventOwnerName", <CalendarEventOwnerName data-testid="t" />],
    ["CategoryName", <CategoryName data-testid="t" />],
    ["DogmaAttributeName", <DogmaAttributeName data-testid="t" />],
    ["DogmaEffectName", <DogmaEffectName data-testid="t" />],
    ["GroupName", <GroupName data-testid="t" />],
    ["MailingListName", <MailingListName data-testid="t" />],
    ["MarketGroupName", <MarketGroupName data-testid="t" />],
    ["MoonName", <MoonName data-testid="t" />],
    ["PlanetName", <PlanetName data-testid="t" />],
    ["RaceName", <RaceName data-testid="t" />],
  ])("%s renders a skeleton when name is missing", (_label, element) => {
    renderWithMantine(element);
    const text = screen.getByTestId("t");
    // The skeleton is rendered as a child span, so the container has content
    // but no resolved name text.
    expect(text).toBeInTheDocument();
    expect(text.querySelector("span")).toBeInTheDocument();
  });
});

describe("LabelName / StarName / StargateName with empty name", () => {
  // These dumb components render <Text>{name}</Text> with no skeleton branch.
  it.each<[string, ReactElement]>([
    ["LabelName", <LabelName data-testid="t" />],
    ["StarName", <StarName data-testid="t" />],
    ["StargateName", <StargateName data-testid="t" />],
  ])("%s renders empty text without a name", (_label, element) => {
    renderWithMantine(element);
    expect(screen.getByTestId("t")).toBeEmptyDOMElement();
  });
});

describe("CSPACostText", () => {
  it("renders the cost followed by ISK", () => {
    renderWithMantine(<CSPACostText cost={2500} />);
    expect(screen.getByText("2500 ISK")).toBeInTheDocument();
  });

  it("renders without a cost", () => {
    renderWithMantine(<CSPACostText data-testid="cspa" />);
    expect(screen.getByTestId("cspa")).toHaveTextContent("ISK");
  });
});

describe("ISKAmount", () => {
  it("abbreviates large amounts with a suffix", () => {
    renderWithMantine(<ISKAmount amount={1_500_000} />);
    expect(screen.getByText("1.5M ISK")).toBeInTheDocument();
  });

  it("renders the full amount when showFullAmount is set", () => {
    renderWithMantine(<ISKAmount amount={1234} showFullAmount />);
    expect(screen.getByText("1,234 ISK")).toBeInTheDocument();
  });

  it("renders 0 for amounts below the smallest lookup value", () => {
    renderWithMantine(<ISKAmount amount={0} />);
    expect(screen.getByText("0 ISK")).toBeInTheDocument();
  });

  it("renders a skeleton when amount is undefined", () => {
    renderWithMantine(<ISKAmount data-testid="isk" />);
    // The placeholder text "123456789" lives inside the skeleton.
    expect(screen.getByText("123456789")).toBeInTheDocument();
  });
});

describe("Position3DText", () => {
  it("renders x/y/z coordinates", () => {
    renderWithMantine(<Position3DText position={[1, 2, 3]} />);
    expect(screen.getByText(/x: 1/)).toBeInTheDocument();
    expect(screen.getByText(/y: 2/)).toBeInTheDocument();
    expect(screen.getByText(/z: 3/)).toBeInTheDocument();
  });

  it("renders only the provided coordinate", () => {
    renderWithMantine(<Position3DText position={[7]} />);
    expect(screen.getByText(/x: 7/)).toBeInTheDocument();
  });

  it("omits an absent x while still rendering y and z", () => {
    renderWithMantine(
      <Position3DText
        data-testid="pos"
        position={[undefined as never, 5, 9]}
      />,
    );
    const text = screen.getByTestId("pos");
    expect(text).toHaveTextContent("y: 5");
    expect(text).toHaveTextContent("z: 9");
    expect(text).not.toHaveTextContent("x:");
  });

  it("renders a skeleton when position is undefined", () => {
    renderWithMantine(<Position3DText />);
    expect(screen.getByText("Unknown Position")).toBeInTheDocument();
  });
});

describe("EveMailSenderName", () => {
  it("renders Unknown when from is missing", () => {
    renderWithMantine(<EveMailSenderName />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("renders the matching mailing list name", () => {
    renderWithMantine(
      <EveMailSenderName
        from={42}
        mailingLists={[{ mailing_list_id: 42, name: "Corp Broadcast" }]}
      />,
    );
    expect(screen.getByText("Corp Broadcast")).toBeInTheDocument();
  });

  it("delegates to EveEntityName when no mailing list matches", () => {
    renderWithMantine(<EveMailSenderName from={99} mailingLists={[]} />);
    expect(screen.getByText("Resolved Name")).toBeInTheDocument();
  });
});

describe("WarAggressorName", () => {
  it("renders the alliance name when an alliance id is given", () => {
    renderWithMantine(<WarAggressorName aggressorAllianceId={1} />);
    expect(screen.getByText("Resolved Name")).toBeInTheDocument();
  });

  it("renders the corporation name when only a corporation id is given", () => {
    renderWithMantine(<WarAggressorName aggressorCorporationId={2} />);
    expect(screen.getByText("Resolved Name")).toBeInTheDocument();
  });

  it("falls back to EveEntityName when nothing is given", () => {
    renderWithMantine(<WarAggressorName data-testid="agg" />);
    // EveEntityName with no entityId renders a skeleton placeholder.
    expect(screen.getByTestId("agg").querySelector("span")).toBeInTheDocument();
  });
});

describe("WarDefenderName", () => {
  it("renders the alliance name when an alliance id is given", () => {
    renderWithMantine(<WarDefenderName defenderAllianceId={1} />);
    expect(screen.getByText("Resolved Name")).toBeInTheDocument();
  });

  it("renders the corporation name when only a corporation id is given", () => {
    renderWithMantine(<WarDefenderName defenderCorporationId={2} />);
    expect(screen.getByText("Resolved Name")).toBeInTheDocument();
  });

  it("falls back to EveEntityName when nothing is given", () => {
    renderWithMantine(<WarDefenderName data-testid="def" />);
    expect(screen.getByTestId("def").querySelector("span")).toBeInTheDocument();
  });
});

describe("AssetLocationName", () => {
  it("renders Asset Safety for the special location id 2004", () => {
    renderWithMantine(<AssetLocationName locationId={2004} />);
    expect(screen.getByText("Asset Safety")).toBeInTheDocument();
  });

  it("renders NO LOCATION when the location is unknown", () => {
    renderWithMantine(<AssetLocationName locationId={123} />);
    expect(screen.getByText("NO LOCATION")).toBeInTheDocument();
  });

  it("renders NO LOCATION when no location id is provided", () => {
    renderWithMantine(<AssetLocationName />);
    expect(screen.getByText("NO LOCATION")).toBeInTheDocument();
  });

  it("renders ITEM LOCATION for item location types", () => {
    mockLocations = { 10: { location_type: "item" } };
    renderWithMantine(<AssetLocationName locationId={10} />);
    expect(screen.getByText("ITEM LOCATION")).toBeInTheDocument();
  });

  it("renders OTHER LOCATION for other location types", () => {
    mockLocations = { 11: { location_type: "other" } };
    renderWithMantine(<AssetLocationName locationId={11} />);
    expect(screen.getByText("OTHER LOCATION")).toBeInTheDocument();
  });

  it("resolves station/system locations via EveEntityName", () => {
    mockLocations = { 12: { location_type: "station" } };
    renderWithMantine(<AssetLocationName locationId={12} />);
    expect(screen.getByText("Resolved Name")).toBeInTheDocument();
  });
});
