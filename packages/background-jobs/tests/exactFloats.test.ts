import { describe, expect, it } from "@jest/globals";

import { Prisma } from "@jitaspace/db";

import { exactFloats } from "../helpers/exactFloats";

describe("exactFloats", () => {
  it("passes a double past the safe-integer range as its exact Decimal", () => {
    // An SDE moon mass Prisma's model write stored as -1.716920912521205e+19.
    const row = exactFloats({ moonId: 1, massDust: -17169209125212047000 });

    expect(row.massDust).toBeInstanceOf(Prisma.Decimal);
    expect(String(row.massDust)).toBe("-17169209125212047000");
    expect(Number(String(row.massDust))).toBe(-17169209125212047000);
  });

  it("keeps exponent-form magnitudes exact", () => {
    const row = exactFloats({ massGas: 4.97553007640218e22 });

    expect(Number(String(row.massGas))).toBe(4.97553007640218e22);
  });

  it("leaves safe integers, fractions, non-finite and non-numbers alone", () => {
    const row = {
      id: Number.MAX_SAFE_INTEGER,
      radius: 3_740_000.5,
      tiny: 1.2345678901234566e-7,
      inf: Infinity,
      nan: NaN,
      name: "Jita IV - Moon 4",
      flag: true,
      big: 12345678901234567890n,
      nothing: null,
    };

    expect(exactFloats(row)).toBe(row); // untouched rows are not copied
  });

  it("does not mutate the row it is given", () => {
    const row = { massDust: 3.2104159745e22, name: "x" };
    const out = exactFloats(row);

    expect(out).not.toBe(row);
    expect(row.massDust).toBe(3.2104159745e22);
    expect(out.name).toBe("x");
  });
});
