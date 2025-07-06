"use client";

import { Link } from "@mantine/tiptap";
import { mergeAttributes } from "@tiptap/core";

const STATION_TYPE_IDS = [
  54, 56, 57, 58, 59, 1529, 1530, 1531, 1926, 1927, 1928, 1929, 1930, 1931,
  1932, 2071, 2496, 2497, 2498, 2499, 2500, 2501, 2502, 3864, 3865, 3866, 3867,
  3868, 3869, 3870, 3871, 3872, 4023, 4024, 9856, 9857, 9867, 9868, 9873, 10795,
  12242, 12294, 12295, 19757, 21642, 21644, 21645, 21646, 22296, 22297, 22298,
  29323, 29387, 29388, 29389, 29390, 34325, 34326, 52678, 59956, 71361, 74397,
];

const CHARACTER_TYPE_IDS = [
  1373, 1374, 1375, 1376, 1377, 1378, 1379, 1380, 1381, 1382, 1383, 1384, 1385,
  1386, 34574,
];

// FIXME: These should be configurable
const renderEveHref = (href: string) => {
  const INVENTORY_INFO_PREFIX = "showinfo:";
  const WAR_REPORT_PREFIX = "warReport:";

  if (href.startsWith(INVENTORY_INFO_PREFIX)) {
    const targetType = href.slice(INVENTORY_INFO_PREFIX.length).split("//");
    if (targetType.length === 1) {
      return `/type/${targetType[0]}`;
    }
    if (targetType[0] === "2") return `/corporation/${targetType[1]}`;

    if (targetType[0] === "3") return `/region/${targetType[1]}`;

    if (targetType[0] === "4") return `/constellation/${targetType[1]}`;

    if (targetType[0] === "5") return `/system/${targetType[1]}`;

    if (targetType[0] === "16159") return `/alliance/${targetType[1]}`;

    if (CHARACTER_TYPE_IDS.includes(parseInt(targetType[0] ?? "")))
      return `/character/${targetType[1]}`;

    if (STATION_TYPE_IDS.includes(parseInt(targetType[0] ?? "")))
      return `/station/${targetType[1]}`;
  }

  if (href.startsWith(WAR_REPORT_PREFIX)) {
    const warId = href.slice(WAR_REPORT_PREFIX.length);
    return `/war/${warId}`;
  }

  return href;
};

export const EveLink = Link.extend({
  renderHTML({ HTMLAttributes }) {
    //console.log("EveLink HTMLAttributes:", HTMLAttributes);
    return [
      "a",
      mergeAttributes(this.options.HTMLAttributes, {
        ...HTMLAttributes,
        href: renderEveHref(String(HTMLAttributes?.href ?? "")),
      }),
      0,
    ];
  },
});
