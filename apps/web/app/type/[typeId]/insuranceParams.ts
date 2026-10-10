import { parseAsStringLiteral } from "nuqs";

import { INSURANCE_LEVEL_KEYS } from "~/lib/insurance";

/** How the Insurance tab shows the price history. */
export const INSURANCE_HISTORY_VIEWS = ["chart", "table"] as const;
export type InsuranceHistoryView = (typeof INSURANCE_HISTORY_VIEWS)[number];

/**
 * The Insurance tab's URL state, so a link opens the same view. Namespaced
 * (`insuranceView`, `insuranceTier`): the type page owns `tab`, and its
 * other tabs may own params of their own.
 */
export const insuranceHistoryParsers = {
  view: parseAsStringLiteral(INSURANCE_HISTORY_VIEWS).withDefault("chart"),
  tier: parseAsStringLiteral(INSURANCE_LEVEL_KEYS).withDefault("platinum"),
};

export const insuranceHistoryUrlKeys = {
  view: "insuranceView",
  tier: "insuranceTier",
} as const;
