export const skillLevelRomanNumeral = (n: number): string =>
  ({
    1: "I",
    2: "II",
    3: "III",
    4: "IV",
    5: "V",
  })[n] ?? "[Invalid Level]";
