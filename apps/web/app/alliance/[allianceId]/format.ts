import { formatDistanceStrict } from "date-fns";

export { formatDecimal, formatInteger, formatPercent } from "~/lib/format";

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
