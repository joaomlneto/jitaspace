import { skillLevelRomanNumeral } from "../src/skills";

describe("skillLevelRomanNumeral", () => {
  it("returns 'I' for level 1", () => {
    expect(skillLevelRomanNumeral(1)).toBe("I");
  });

  it("returns 'II' for level 2", () => {
    expect(skillLevelRomanNumeral(2)).toBe("II");
  });

  it("returns 'III' for level 3", () => {
    expect(skillLevelRomanNumeral(3)).toBe("III");
  });

  it("returns 'IV' for level 4", () => {
    expect(skillLevelRomanNumeral(4)).toBe("IV");
  });

  it("returns 'V' for level 5", () => {
    expect(skillLevelRomanNumeral(5)).toBe("V");
  });

  it("returns '[Invalid Level]' for level 0", () => {
    expect(skillLevelRomanNumeral(0)).toBe("[Invalid Level]");
  });

  it("returns '[Invalid Level]' for level 6 (out of range)", () => {
    expect(skillLevelRomanNumeral(6)).toBe("[Invalid Level]");
  });

  it("returns '[Invalid Level]' for negative level", () => {
    expect(skillLevelRomanNumeral(-1)).toBe("[Invalid Level]");
  });

  it("returns '[Invalid Level]' for non-integer level", () => {
    expect(skillLevelRomanNumeral(2.5)).toBe("[Invalid Level]");
  });
});
