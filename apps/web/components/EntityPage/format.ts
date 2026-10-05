const numberFormat = new Intl.NumberFormat("en-US");

/** A count with thousands separators: "7,125". */
export const formatCount = (value: number) => numberFormat.format(value);

/** "1 epic arc", "2 epic arcs". */
export const formatCountOf = (value: number, one: string, many: string) =>
  `${formatCount(value)} ${value === 1 ? one : many}`;
