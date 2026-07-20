import {
  nextPowerOfTwo,
  esiImageSizeClamp,
  getRandomArbitrary,
  getRandomInt,
  shuffleArray,
  getRandomArrayEntry,
  randomBoolean,
  randomExponential,
  randomGeometric,
} from "../src/math";

describe("nextPowerOfTwo", () => {
  it("returns 1 for 1", () => {
    expect(nextPowerOfTwo(1)).toBe(1);
  });

  it("returns 2 for 2", () => {
    expect(nextPowerOfTwo(2)).toBe(2);
  });

  it("returns 4 for 3", () => {
    expect(nextPowerOfTwo(3)).toBe(4);
  });

  it("returns 4 for 4", () => {
    expect(nextPowerOfTwo(4)).toBe(4);
  });

  it("returns 8 for 5", () => {
    expect(nextPowerOfTwo(5)).toBe(8);
  });

  it("returns 32 for 17", () => {
    expect(nextPowerOfTwo(17)).toBe(32);
  });

  it("returns 64 for 64", () => {
    expect(nextPowerOfTwo(64)).toBe(64);
  });

  it("returns 128 for 65", () => {
    expect(nextPowerOfTwo(65)).toBe(128);
  });

  it("returns 1024 for 1000", () => {
    expect(nextPowerOfTwo(1000)).toBe(1024);
  });

  it("returns 1024 for 512+1", () => {
    expect(nextPowerOfTwo(513)).toBe(1024);
  });
});

describe("esiImageSizeClamp", () => {
  it("clamps very small sizes to 32 (minimum)", () => {
    expect(esiImageSizeClamp(1)).toBe(32);
  });

  it("returns 32 for size 20", () => {
    expect(esiImageSizeClamp(20)).toBe(32);
  });

  it("returns 32 for size 32", () => {
    expect(esiImageSizeClamp(32)).toBe(32);
  });

  it("returns 64 for size 33", () => {
    expect(esiImageSizeClamp(33)).toBe(64);
  });

  it("returns 64 for size 64", () => {
    expect(esiImageSizeClamp(64)).toBe(64);
  });

  it("returns 128 for size 100", () => {
    expect(esiImageSizeClamp(100)).toBe(128);
  });

  it("returns 256 for size 256", () => {
    expect(esiImageSizeClamp(256)).toBe(256);
  });

  it("returns 512 for size 300", () => {
    expect(esiImageSizeClamp(300)).toBe(512);
  });

  it("returns 1024 for size 1024", () => {
    expect(esiImageSizeClamp(1024)).toBe(1024);
  });

  it("clamps sizes above 1024 to 1024 (maximum)", () => {
    expect(esiImageSizeClamp(2000)).toBe(1024);
  });
});

describe("getRandomArbitrary", () => {
  it("returns a number within [min, max)", () => {
    for (let i = 0; i < 100; i++) {
      const result = getRandomArbitrary(5, 10);
      expect(result).toBeGreaterThanOrEqual(5);
      expect(result).toBeLessThan(10);
    }
  });

  it("returns a number within negative range", () => {
    for (let i = 0; i < 50; i++) {
      const result = getRandomArbitrary(-10, -5);
      expect(result).toBeGreaterThanOrEqual(-10);
      expect(result).toBeLessThan(-5);
    }
  });

  it("returns a number", () => {
    expect(typeof getRandomArbitrary(0, 1)).toBe("number");
  });
});

describe("getRandomInt", () => {
  it("returns an integer within [min, max] inclusive", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const result = getRandomInt(1, 5);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(5);
      expect(Number.isInteger(result)).toBe(true);
      seen.add(result);
    }
    // With 1000 iterations, we should see all values 1-5
    expect(seen.size).toBe(5);
  });

  it("returns the only possible value when min === max", () => {
    expect(getRandomInt(7, 7)).toBe(7);
  });

  it("handles non-integer inputs by flooring/ceiling", () => {
    for (let i = 0; i < 50; i++) {
      const result = getRandomInt(1.5, 3.7);
      expect(result).toBeGreaterThanOrEqual(2);
      expect(result).toBeLessThanOrEqual(3);
      expect(Number.isInteger(result)).toBe(true);
    }
  });
});

describe("shuffleArray", () => {
  it("preserves array length", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffleArray([...arr])).toHaveLength(5);
  });

  it("returns an array with the same elements", () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray([...arr]);
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("mutates and returns the same array reference", () => {
    const arr = [1, 2, 3];
    const result = shuffleArray(arr);
    expect(result).toBe(arr);
  });

  it("handles empty array", () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it("handles single-element array", () => {
    expect(shuffleArray([42])).toEqual([42]);
  });
});

describe("getRandomArrayEntry", () => {
  it("returns an element that exists in the array", () => {
    const arr = [10, 20, 30, 40, 50];
    for (let i = 0; i < 50; i++) {
      const entry = getRandomArrayEntry(arr);
      expect(arr).toContain(entry);
    }
  });

  it("returns the only element for a single-element array", () => {
    expect(getRandomArrayEntry(["only"])).toBe("only");
  });

  it("returns a string from a string array", () => {
    const arr = ["a", "b", "c"];
    expect(typeof getRandomArrayEntry(arr)).toBe("string");
  });
});

describe("randomBoolean", () => {
  it("returns a boolean", () => {
    expect(typeof randomBoolean()).toBe("boolean");
  });

  it("always returns false when probability is 0", () => {
    for (let i = 0; i < 50; i++) {
      expect(randomBoolean(0)).toBe(false);
    }
  });

  it("always returns true when probability is 1", () => {
    for (let i = 0; i < 50; i++) {
      expect(randomBoolean(1)).toBe(true);
    }
  });
});

describe("randomExponential", () => {
  it("returns a positive number", () => {
    for (let i = 0; i < 50; i++) {
      expect(randomExponential(1)).toBeGreaterThan(0);
    }
  });

  it("returns a number (default rate = 1)", () => {
    expect(typeof randomExponential()).toBe("number");
  });
});

describe("randomGeometric", () => {
  it("returns a non-negative integer", () => {
    for (let i = 0; i < 50; i++) {
      const result = randomGeometric(0.5);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it("returns a number with default success probability", () => {
    expect(typeof randomGeometric()).toBe("number");
  });
});
