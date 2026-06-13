"use client";

import TipTapLink from "@tiptap/extension-link";

const Link = TipTapLink.configure({ openOnClick: false });

const STATION_TYPE_IDS = new Set([
  54, 56, 57, 58, 59, 1529, 1530, 1531, 1926, 1927, 1928, 1929, 1930, 1931,
  1932, 2071, 2496, 2497, 2498, 2499, 2500, 2501, 2502, 3864, 3865, 3866, 3867,
  3868, 3869, 3870, 3871, 3872, 4023, 4024, 9856, 9857, 9867, 9868, 9873, 10795,
  12242, 12294, 12295, 19757, 21642, 21644, 21645, 21646, 22296, 22297, 22298,
  29323, 29387, 29388, 29389, 29390, 34325, 34326, 52678, 59956, 71361, 74397,
]);

const CHARACTER_TYPE_IDS = new Set([
  1373, 1374, 1375, 1376, 1377, 1378, 1379, 1380, 1381, 1382, 1383, 1384, 1385,
  1386, 34574,
]);

const STRUCTURE_TYPE_IDS = new Set([
  35825, 35826, 35827, 35828, 35829, 35830, 35832, 35833, 35834, 35835, 35836,
  35837, 35838, 35839, 35840, 35841, 35842, 35843, 35844, 35845, 37533, 37534,
  37535, 37536, 40340, 45006, 46363, 46364, 47512, 47513, 47514, 47515, 47516,
  49600, 49601, 71116, 71117, 71118, 71119, 78260, 79172, 81826,
]);

// FIXME: These should be configurable
export const renderEveHref = (href: string) => {
  const INVENTORY_INFO_PREFIX = "showinfo:";
  const WAR_REPORT_PREFIX = "warReport:";
  const KILL_REPORT_PREFIX = "killReport:";
  const RECRUITMENT_AD_PREFIX = "recruitmentAd:";
  const CONTRACT_PREFIX = "contract:";

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

    if (CHARACTER_TYPE_IDS.has(parseInt(targetType[0] ?? "", 10)))
      return `/character/${targetType[1]}`;

    if (STATION_TYPE_IDS.has(parseInt(targetType[0] ?? "", 10)))
      return `/station/${targetType[1]}`;

    if (STRUCTURE_TYPE_IDS.has(parseInt(targetType[0] ?? "", 10)))
      return `/structure/${targetType[1]}`;
  }

  if (href.startsWith(WAR_REPORT_PREFIX)) {
    const warId = href.slice(WAR_REPORT_PREFIX.length);
    return `/war/${warId}`;
  }

  if (href.startsWith(KILL_REPORT_PREFIX)) {
    const [killId, hash] = href.slice(KILL_REPORT_PREFIX.length).split(":");
    return hash ? `/kill/${killId}?hash=${hash}` : `/kill/${killId}`;
  }

  if (href.startsWith(RECRUITMENT_AD_PREFIX)) {
    const corporationId = href
      .slice(RECRUITMENT_AD_PREFIX.length)
      .split("//")[0];
    return `/corporation/${corporationId}`;
  }

  if (href.startsWith(CONTRACT_PREFIX)) {
    const contractId = href.slice(CONTRACT_PREFIX.length).split("//")[1];
    return `/contract/${contractId}`;
  }

  return href;
};

// TipTap 3 uses linkifyjs v4, whose registerCustomProtocol() rejects any scheme
// that is not all-lowercase (RFC 3986). EVE's schemes are camelCase
// (warReport:, joinChannel:, …), so the names registered here MUST be lowercase
// or the editor throws at construction.
//
// This only affects scheme *registration*. linkifyjs's isAllowedUri() matches
// schemes case-insensitively, so a camelCase href in mail content
// (<a href="warReport:42">) is still recognised and preserved verbatim by
// TipTap. That is why renderEveHref above and the click handlers in
// MailMessageViewer match the original camelCase scheme names: the hrefs flowing
// through the editor are never lowercased.
export const EveLink = Link.configure({
  protocols: [
    "showinfo",
    "warreport",
    "killreport",
    "recruitmentad",
    "contract",
    "joinchannel",
    "helppointer",
    "shipskinlisting",
    "fitting",
    "localsvc",
    "opportunity",
    "careerprogramnode",
    "fleet",
  ],
});
