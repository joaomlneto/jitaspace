import {
  toRomanNumeral,
  formatStarName,
  formatPlanetName,
  formatMoonName,
  formatAsteroidBeltName,
  formatStationName,
  formatStargateName,
} from "../src/sde";

describe("toRomanNumeral", () => {
  it("returns 'I' for 1", () => {
    expect(toRomanNumeral(1)).toBe("I");
  });

  it("returns 'II' for 2", () => {
    expect(toRomanNumeral(2)).toBe("II");
  });

  it("returns 'III' for 3", () => {
    expect(toRomanNumeral(3)).toBe("III");
  });

  it("returns 'IV' for 4", () => {
    expect(toRomanNumeral(4)).toBe("IV");
  });

  it("returns 'V' for 5", () => {
    expect(toRomanNumeral(5)).toBe("V");
  });

  it("returns 'VI' for 6", () => {
    expect(toRomanNumeral(6)).toBe("VI");
  });

  it("returns 'VII' for 7", () => {
    expect(toRomanNumeral(7)).toBe("VII");
  });

  it("returns 'VIII' for 8", () => {
    expect(toRomanNumeral(8)).toBe("VIII");
  });

  it("returns 'IX' for 9", () => {
    expect(toRomanNumeral(9)).toBe("IX");
  });

  it("returns 'X' for 10", () => {
    expect(toRomanNumeral(10)).toBe("X");
  });

  it("returns 'XIV' for 14", () => {
    expect(toRomanNumeral(14)).toBe("XIV");
  });

  it("returns 'XL' for 40", () => {
    expect(toRomanNumeral(40)).toBe("XL");
  });

  it("returns 'XC' for 90", () => {
    expect(toRomanNumeral(90)).toBe("XC");
  });

  it("returns 'CD' for 400", () => {
    expect(toRomanNumeral(400)).toBe("CD");
  });

  it("returns 'CM' for 900", () => {
    expect(toRomanNumeral(900)).toBe("CM");
  });

  it("returns 'M' for 1000", () => {
    expect(toRomanNumeral(1000)).toBe("M");
  });

  it("returns 'MMMCMXCIX' for 3999", () => {
    expect(toRomanNumeral(3999)).toBe("MMMCMXCIX");
  });

  it("returns '0' for 0 (non-positive)", () => {
    expect(toRomanNumeral(0)).toBe("0");
  });

  it("returns '-1' for -1 (negative)", () => {
    expect(toRomanNumeral(-1)).toBe("-1");
  });

  it("returns '-100' for -100 (large negative)", () => {
    expect(toRomanNumeral(-100)).toBe("-100");
  });

  it("truncates non-integer: 3.9 is treated as 3 -> 'III'", () => {
    expect(toRomanNumeral(3.9)).toBe("III");
  });

  it("truncates non-integer: 1.1 is treated as 1 -> 'I'", () => {
    expect(toRomanNumeral(1.1)).toBe("I");
  });

  it("returns 'Infinity' for Infinity", () => {
    expect(toRomanNumeral(Infinity)).toBe("Infinity");
  });

  it("returns 'NaN' for NaN", () => {
    expect(toRomanNumeral(NaN)).toBe("NaN");
  });
});

describe("formatStarName", () => {
  it("returns solarSystemName when provided as a string", () => {
    expect(formatStarName({ solarSystemName: "Jita" })).toBe("Jita");
  });

  it("returns the English localized name when name.en is provided", () => {
    expect(formatStarName({ name: { en: "Amarr" } })).toBe("Amarr");
  });

  it("returns a fallback localized name when en is absent", () => {
    expect(formatStarName({ name: { de: "DeutschStar" } })).toBe("DeutschStar");
  });

  it("prefers solarSystemName over name.en", () => {
    expect(
      formatStarName({ solarSystemName: "Dodixie", name: { en: "Other" } }),
    ).toBe("Dodixie");
  });

  it("returns empty string when no name info is provided", () => {
    expect(formatStarName({})).toBe("");
  });
});

describe("formatPlanetName", () => {
  it("returns uniqueName (en) when provided", () => {
    expect(
      formatPlanetName({
        celestialIndex: 3,
        orbitName: "Caldari Prime",
        uniqueName: { en: "Custom Planet" },
      }),
    ).toBe("Custom Planet");
  });

  it("returns uniqueName fallback locale when en absent", () => {
    expect(
      formatPlanetName({
        celestialIndex: 2,
        uniqueName: { fr: "PlaneteFR" },
      }),
    ).toBe("PlaneteFR");
  });

  it("formats with orbitName and celestialIndex roman numeral", () => {
    expect(
      formatPlanetName({ celestialIndex: 3, orbitName: "Jita" }),
    ).toBe("Jita III");
  });

  it("returns just the roman numeral when orbitName is absent", () => {
    expect(formatPlanetName({ celestialIndex: 5 })).toBe("V");
  });

  it("returns roman numeral I for celestialIndex 1 with no orbitName", () => {
    expect(formatPlanetName({ celestialIndex: 1 })).toBe("I");
  });
});

describe("formatMoonName", () => {
  it("returns uniqueName (en) when provided", () => {
    expect(
      formatMoonName({
        orbitIndex: 1,
        orbitName: "Jita IV",
        uniqueName: { en: "Special Moon" },
      }),
    ).toBe("Special Moon");
  });

  it("formats with orbitName and orbitIndex", () => {
    expect(
      formatMoonName({ orbitIndex: 2, orbitName: "Jita IV" }),
    ).toBe("Jita IV - Moon 2");
  });

  it("returns orbitIndex as string when no orbitName", () => {
    expect(formatMoonName({ orbitIndex: 3 })).toBe("3");
  });
});

describe("formatAsteroidBeltName", () => {
  it("returns uniqueName (en) when provided", () => {
    expect(
      formatAsteroidBeltName({
        orbitIndex: 1,
        orbitName: "Jita IV",
        uniqueName: { en: "Custom Belt" },
      }),
    ).toBe("Custom Belt");
  });

  it("formats with orbitName and orbitIndex", () => {
    expect(
      formatAsteroidBeltName({ orbitIndex: 1, orbitName: "Jita IV" }),
    ).toBe("Jita IV - Asteroid Belt 1");
  });

  it("returns orbitIndex as string when no orbitName", () => {
    expect(formatAsteroidBeltName({ orbitIndex: 2 })).toBe("2");
  });
});

describe("formatStationName", () => {
  it("returns 'orbitName - corporationName' when both provided", () => {
    expect(
      formatStationName({
        orbitName: "Jita IV - Moon 4",
        corporationName: "Caldari Navy",
      }),
    ).toBe("Jita IV - Moon 4 - Caldari Navy");
  });

  it("returns just orbitName when corporationName is absent", () => {
    expect(formatStationName({ orbitName: "Jita IV" })).toBe("Jita IV");
  });

  it("returns just corporationName when orbitName is absent", () => {
    expect(
      formatStationName({ corporationName: "Caldari Navy" }),
    ).toBe("Caldari Navy");
  });

  it("returns empty string when both orbitName and corporationName are absent", () => {
    expect(formatStationName({})).toBe("");
  });

  it("appends operationName when useOperationName is true", () => {
    expect(
      formatStationName({
        orbitName: "Jita IV - Moon 4",
        corporationName: "Caldari Navy",
        operationName: "Station",
        useOperationName: true,
      }),
    ).toBe("Jita IV - Moon 4 - Caldari Navy Station");
  });

  it("does not append operationName when useOperationName is false", () => {
    expect(
      formatStationName({
        orbitName: "Jita IV",
        operationName: "Station",
        useOperationName: false,
      }),
    ).toBe("Jita IV");
  });

  it("returns operationName alone when base is empty and useOperationName is true", () => {
    expect(
      formatStationName({
        operationName: "Station",
        useOperationName: true,
      }),
    ).toBe("Station");
  });

  it("returns empty string when operationName is null and useOperationName is true", () => {
    expect(
      formatStationName({
        operationName: null,
        useOperationName: true,
      }),
    ).toBe("");
  });
});

describe("formatStargateName", () => {
  it("returns 'Stargate (SystemName)' when solarSystemName is provided", () => {
    expect(formatStargateName({ solarSystemName: "Jita" })).toBe(
      "Stargate (Jita)",
    );
  });

  it("returns 'Stargate (SystemName)' when name.en is provided", () => {
    expect(formatStargateName({ name: { en: "Amarr" } })).toBe(
      "Stargate (Amarr)",
    );
  });

  it("returns 'Stargate' when no system name info is provided", () => {
    expect(formatStargateName({})).toBe("Stargate");
  });
});
