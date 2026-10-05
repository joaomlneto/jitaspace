/**
 * Number formatting shared by the entity pages. Fixed to `en-US`, not the
 * browser's locale, so the server render and hydration print the same thing.
 */

const integerFormat = new Intl.NumberFormat("en-US");
const decimalFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});
const percentFormat = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

/** `12345` → `12,345`. */
export const formatInteger = (value: number) => integerFormat.format(value);
/** `3.14159` → `3.1`. */
export const formatDecimal = (value: number) => decimalFormat.format(value);
/** `0.123` → `12.3%`. */
export const formatPercent = (fraction: number) =>
  percentFormat.format(fraction);
