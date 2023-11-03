export const characterIdRanges: [number, number][] = [
  [3000000, 4000000],
  [90000000, 98000000],
  [2100000000, 2147483647],
];

export const corporationIdRanges: [number, number][] = [
  [1000000, 2000000],
  [98000000, 99000000],
];

export const allianceIdRanges: [number, number][] = [[99000000, 100000000]];

export const regionIdRanges: [number, number][] = [[10000000, 13000000]];
export const constellationIdRanges: [number, number][] = [[20000000, 23000000]];

export const solarSystemRanges: [number, number][] = [[30000000, 33000000]];

export const stargateRanges: [number, number][] = [[50000000, 60000000]];

export const stationRanges: [number, number][] = [[60000000, 70000000]];

export const isIdInRanges = (id: number, ranges: [number, number][]) =>
  ranges.some(([min, max]) => id >= min && id <= max);
