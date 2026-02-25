type LocalizedName = Record<string, string | undefined> & {
  en?: string;
};

export const toRomanNumeral = (value: number): string => {
  if (!Number.isFinite(value)) return String(value);
  const integerValue = Math.trunc(value);
  if (integerValue <= 0) return String(integerValue);

  const romanPairs: Array<{ value: number; symbol: string }> = [
    { value: 1000, symbol: "M" },
    { value: 900, symbol: "CM" },
    { value: 500, symbol: "D" },
    { value: 400, symbol: "CD" },
    { value: 100, symbol: "C" },
    { value: 90, symbol: "XC" },
    { value: 50, symbol: "L" },
    { value: 40, symbol: "XL" },
    { value: 10, symbol: "X" },
    { value: 9, symbol: "IX" },
    { value: 5, symbol: "V" },
    { value: 4, symbol: "IV" },
    { value: 1, symbol: "I" },
  ];

  let remainder = integerValue;
  let result = "";

  for (const { value: valueThreshold, symbol } of romanPairs) {
    while (remainder >= valueThreshold) {
      result += symbol;
      remainder -= valueThreshold;
    }
  }

  return result;
};

const resolveLocalizedName = (name?: LocalizedName): string | undefined => {
  if (!name) return undefined;
  return name.en ?? Object.values(name).find((value) => value !== undefined);
};

type SolarSystemNameInput = {
  solarSystemName?: string;
  name?: LocalizedName;
};

const resolveSolarSystemName = (input: SolarSystemNameInput): string =>
  input.solarSystemName ?? resolveLocalizedName(input.name) ?? "";

export const formatStarName = (input: SolarSystemNameInput): string =>
  resolveSolarSystemName(input);

type PlanetNameInput = {
  celestialIndex: number;
  orbitName?: string;
  uniqueName?: LocalizedName;
};

export const formatPlanetName = (input: PlanetNameInput): string => {
  const customName = resolveLocalizedName(input.uniqueName);
  if (customName) return customName;
  const celestialIndex = toRomanNumeral(input.celestialIndex);
  if (input.orbitName) return `${input.orbitName} ${celestialIndex}`;
  return celestialIndex;
};

type MoonNameInput = {
  orbitIndex: number;
  orbitName?: string;
  uniqueName?: LocalizedName;
};

export const formatMoonName = (input: MoonNameInput): string => {
  const customName = resolveLocalizedName(input.uniqueName);
  if (customName) return customName;
  if (input.orbitName) return `${input.orbitName} - Moon ${input.orbitIndex}`;
  return `${input.orbitIndex}`;
};

type AsteroidBeltNameInput = {
  orbitIndex: number;
  orbitName?: string;
  uniqueName?: LocalizedName;
};

export const formatAsteroidBeltName = (
  input: AsteroidBeltNameInput,
): string => {
  const customName = resolveLocalizedName(input.uniqueName);
  if (customName) return customName;
  if (input.orbitName)
    return `${input.orbitName} - Asteroid Belt ${input.orbitIndex}`;
  return `${input.orbitIndex}`;
};

type StationNameInput = {
  orbitName?: string;
  corporationName?: string;
  operationName?: string | null;
  useOperationName?: boolean;
};

export const formatStationName = (input: StationNameInput): string => {
  const orbitName = input.orbitName ?? "";
  const corporationName = input.corporationName ?? "";
  const base =
    orbitName && corporationName
      ? `${orbitName} - ${corporationName}`
      : orbitName || corporationName;

  if (input.useOperationName && input.operationName) {
    return base ? `${base} ${input.operationName}` : input.operationName;
  }

  return base;
};

export const formatStargateName = (input: SolarSystemNameInput): string => {
  const solarSystemName = resolveSolarSystemName(input);
  return solarSystemName ? `Stargate (${solarSystemName})` : "Stargate";
};
