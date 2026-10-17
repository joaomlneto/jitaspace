import { describe, expect, it, jest } from "@jest/globals";

import {
  formatWormholeClass,
  isWormholeRegion,
} from "~/components/UniversePage/parts";

jest.mock("@jitaspace/eve-icons", () => ({
  ControlJumpGateLayoutIcon: () => null,
}));

describe("isWormholeRegion", () => {
  it.each([
    [10000002, false], // The Forge
    [10000070, false], // Pochven
    [11000001, true], // A-R00001
    [11000033, true], // Thera's
    [12000001, false], // Abyssal
    [14000001, false], // a Void region
    [undefined, false],
  ])("%p is wormhole space: %p", (regionId, expected) => {
    expect(isWormholeRegion(regionId)).toBe(expected);
  });
});

describe("formatWormholeClass", () => {
  it.each([
    [1, "C1"],
    [6, "C6"],
    [12, "C12"],
    [13, "C13"],
    [18, "C18"],
  ])("names class %p %p", (wormholeClassId, expected) => {
    expect(formatWormholeClass(wormholeClassId)).toBe(expected);
  });
});
