import { formatDistanceStrict } from "date-fns";

const integerFormat = new Intl.NumberFormat("en-US");
const decimalFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});
const percentFormat = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

export const formatInteger = (value: number) => integerFormat.format(value);
export const formatDecimal = (value: number) => decimalFormat.format(value);
/** `0.123` → `12.3%`. */
export const formatPercent = (fraction: number) =>
  percentFormat.format(fraction);

/** The `YYYY-MM-DD` of an ISO timestamp, in UTC (EVE time). */
export const formatDate = (iso: string) => iso.slice(0, 10);

/** `HH:mm` of an ISO timestamp, in UTC (EVE time). */
export const formatUtcTime = (iso: string) => iso.slice(11, 16);

/** `YYYY-MM-DD HH:mm` of an ISO timestamp, in UTC (EVE time). */
export const formatDateTime = (iso: string) =>
  `${formatDate(iso)} ${formatUtcTime(iso)}`;

/** "11 years" — how long ago `iso` was, measured from `now`. */
export const formatAge = (iso: string, now: string) =>
  formatDistanceStrict(new Date(iso), new Date(now));
