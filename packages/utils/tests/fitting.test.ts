import type { ShipFitting } from "../src/fitting";
import { parseEFTFitString, toEFTFitString } from "../src/fitting";

// A canonical EFT string representative of a typical EVE fitting.
// Sections are separated by blank lines:
//   header
//   low slots
//   (blank)
//   mid slots
//   (blank)
//   high slots
//   (blank)
//   rig slots
//   (blank)
//   subsystem slots
//   (blank)
//   drone bay
//   (blank)
//   cargo hold
const SAMPLE_EFT = `[Venture,Mining Barge]
Mining Laser Upgrade I
Mining Laser Upgrade I

Survey Scanner II,
Multispectral ECM I

Miner II
Miner II

Small Drone Mining Augmentor I
Small Drone Mining Augmentor I

Medium Drone Mining Augmentor I

Hornet EC-300 x5
Warrior I x2

Hobgoblin I x10`;

describe("parseEFTFitString", () => {
  it("parses the ship type and name from the header", () => {
    const fit = parseEFTFitString(SAMPLE_EFT);
    expect(fit.typeName).toBe("Venture");
    expect(fit.shipName).toBe("Mining Barge");
  });

  it("parses low slots correctly", () => {
    const fit = parseEFTFitString(SAMPLE_EFT);
    // Two identical low slot modules are merged (quantity=2) when mergeSimilarModules=true
    expect(fit.lowSlots).toHaveLength(1);
    expect(fit.lowSlots[0]!.name).toBe("Mining Laser Upgrade I");
    expect(fit.lowSlots[0]!.quantity).toBe(2);
  });

  it("parses mid slots correctly", () => {
    const fit = parseEFTFitString(SAMPLE_EFT);
    expect(fit.midSlots).toHaveLength(2);
    expect(fit.midSlots[0]!.name).toBe("Survey Scanner II");
    expect(fit.midSlots[1]!.name).toBe("Multispectral ECM I");
  });

  it("parses ammo for mid slots", () => {
    const fit = parseEFTFitString(SAMPLE_EFT);
    // "Survey Scanner II," with nothing after comma — ammo is empty string
    // "Multispectral ECM I" has no comma, so ammo is undefined
    expect(fit.midSlots[0]!.ammo).toBe("");
    expect(fit.midSlots[1]!.ammo).toBeUndefined();
  });

  it("parses high slots correctly", () => {
    const fit = parseEFTFitString(SAMPLE_EFT);
    // Two Miner II merged into one with quantity=2
    expect(fit.highSlots).toHaveLength(1);
    expect(fit.highSlots[0]!.name).toBe("Miner II");
    expect(fit.highSlots[0]!.quantity).toBe(2);
  });

  it("parses rig slots correctly", () => {
    const fit = parseEFTFitString(SAMPLE_EFT);
    expect(fit.rigSlots).toHaveLength(1);
    expect(fit.rigSlots[0]!.name).toBe("Small Drone Mining Augmentor I");
    expect(fit.rigSlots[0]!.quantity).toBe(2);
  });

  it("parses subsystem slots correctly", () => {
    const fit = parseEFTFitString(SAMPLE_EFT);
    expect(fit.subsystemSlots).toHaveLength(1);
    expect(fit.subsystemSlots[0]!.name).toBe("Medium Drone Mining Augmentor I");
    expect(fit.subsystemSlots[0]!.quantity).toBe(1);
  });

  it("parses drone bay entries with quantities", () => {
    const fit = parseEFTFitString(SAMPLE_EFT);
    expect(fit.droneBay).toHaveLength(2);
    expect(fit.droneBay[0]!.name).toBe("Hornet EC-300");
    expect(fit.droneBay[0]!.quantity).toBe(5);
    expect(fit.droneBay[1]!.name).toBe("Warrior I");
    expect(fit.droneBay[1]!.quantity).toBe(2);
  });

  it("parses cargo hold entries with quantities", () => {
    const fit = parseEFTFitString(SAMPLE_EFT);
    expect(fit.cargoHold).toHaveLength(1);
    expect(fit.cargoHold[0]!.name).toBe("Hobgoblin I");
    expect(fit.cargoHold[0]!.quantity).toBe(10);
  });

  it("does not merge when mergeSimilarModules=false", () => {
    const fit = parseEFTFitString(SAMPLE_EFT, false);
    // Two individual Miner II entries instead of one merged entry
    expect(fit.highSlots).toHaveLength(2);
    expect(fit.highSlots[0]!.quantity).toBe(1);
    expect(fit.highSlots[1]!.quantity).toBe(1);
  });
});

describe("toEFTFitString", () => {
  it("produces the expected header line", () => {
    const fit: ShipFitting = {
      typeName: "Rifter",
      shipName: "Fast Rifter",
      highSlots: [],
      midSlots: [],
      lowSlots: [],
      rigSlots: [],
      subsystemSlots: [],
      droneBay: [],
      cargoHold: [],
    };
    const result = toEFTFitString(fit);
    expect(result.startsWith("[Rifter,Fast Rifter]")).toBe(true);
  });

  it("expands modules with quantity > 1 into multiple lines", () => {
    const fit: ShipFitting = {
      typeName: "Test",
      shipName: "Ship",
      highSlots: [{ name: "Blaster", quantity: 3 }],
      midSlots: [],
      lowSlots: [],
      rigSlots: [],
      subsystemSlots: [],
      droneBay: [],
      cargoHold: [],
    };
    const result = toEFTFitString(fit);
    const highLines = result
      .split("\n")
      .filter((line) => line === "Blaster");
    expect(highLines).toHaveLength(3);
  });

  it("serializes ammo in high/mid slot modules", () => {
    const fit: ShipFitting = {
      typeName: "Test",
      shipName: "Ship",
      highSlots: [{ name: "Railgun", ammo: "Iron Charge", quantity: 1 }],
      midSlots: [],
      lowSlots: [],
      rigSlots: [],
      subsystemSlots: [],
      droneBay: [],
      cargoHold: [],
    };
    const result = toEFTFitString(fit);
    expect(result).toContain("Railgun, Iron Charge");
  });

  it("serializes drone bay with 'x<qty>' suffix", () => {
    const fit: ShipFitting = {
      typeName: "Test",
      shipName: "Ship",
      highSlots: [],
      midSlots: [],
      lowSlots: [],
      rigSlots: [],
      subsystemSlots: [],
      droneBay: [{ name: "Hornet EC-300", quantity: 5 }],
      cargoHold: [],
    };
    const result = toEFTFitString(fit);
    expect(result).toContain("Hornet EC-300 x5");
  });

  it("serializes cargo hold with 'x<qty>' suffix", () => {
    const fit: ShipFitting = {
      typeName: "Test",
      shipName: "Ship",
      highSlots: [],
      midSlots: [],
      lowSlots: [],
      rigSlots: [],
      subsystemSlots: [],
      droneBay: [],
      cargoHold: [{ name: "Nanite Repair Paste", quantity: 200 }],
    };
    const result = toEFTFitString(fit);
    expect(result).toContain("Nanite Repair Paste x200");
  });
});

describe("parseEFTFitString / toEFTFitString roundtrip", () => {
  it("roundtrips a simple fitting: parse then serialize reproduces parseable output", () => {
    const simpleFit = `[Rifter,Solo PvP]
Gyrostabilizer I
Gyrostabilizer I

1MN Afterburner II
Medium Shield Extender II

Autocannon II, Barrage S
Autocannon II, Barrage S

Small Core Defense Field Extender I


`;

    const parsed = parseEFTFitString(simpleFit);
    const serialized = toEFTFitString(parsed);
    const reparsed = parseEFTFitString(serialized);

    // The structural data should be identical after two parse passes
    expect(reparsed.typeName).toBe(parsed.typeName);
    expect(reparsed.shipName).toBe(parsed.shipName);

    // Low slots
    expect(reparsed.lowSlots.length).toBe(parsed.lowSlots.length);
    parsed.lowSlots.forEach((mod, i) => {
      expect(reparsed.lowSlots[i]!.name).toBe(mod.name);
      expect(reparsed.lowSlots[i]!.quantity).toBe(mod.quantity);
    });

    // Mid slots
    expect(reparsed.midSlots.length).toBe(parsed.midSlots.length);
    parsed.midSlots.forEach((mod, i) => {
      expect(reparsed.midSlots[i]!.name).toBe(mod.name);
    });

    // High slots
    expect(reparsed.highSlots.length).toBe(parsed.highSlots.length);
    parsed.highSlots.forEach((mod, i) => {
      expect(reparsed.highSlots[i]!.name).toBe(mod.name);
      expect(reparsed.highSlots[i]!.ammo).toBe(mod.ammo);
      expect(reparsed.highSlots[i]!.quantity).toBe(mod.quantity);
    });

    // Rig slots
    expect(reparsed.rigSlots.length).toBe(parsed.rigSlots.length);
    parsed.rigSlots.forEach((mod, i) => {
      expect(reparsed.rigSlots[i]!.name).toBe(mod.name);
      expect(reparsed.rigSlots[i]!.quantity).toBe(mod.quantity);
    });

    // Drone bay
    expect(reparsed.droneBay.length).toBe(parsed.droneBay.length);

    // Cargo hold
    expect(reparsed.cargoHold.length).toBe(parsed.cargoHold.length);
  });
});
