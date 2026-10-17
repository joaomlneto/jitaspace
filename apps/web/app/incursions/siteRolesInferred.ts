/**
 * Site types for 17 constellations that ESI has listed incursions in since
 * 2022-12 but neither `siteRoles.ts` nor `siteRolesEveUniversity.ts` maps:
 * eve-incursions.de marks their systems "not known", and the EVE University
 * wiki's rows for them each have a typo (a system listed twice, or in two
 * roles, or the staging system among the sites; Crown's row is empty, and
 * Jayai has none).
 *
 * Each layout is the one the layout rule gives (see `CORRECTIONS` in
 * `siteRoles.ts`), from the staging and infested systems ESI reports. Two
 * sources back it:
 *
 * - Every role the wiki gives a system once matches it (77 of 77), and each
 *   system the wiki lists in two roles has the rule's among them (5 of 5).
 * - Killmails on zKillboard during these constellations' incursions put
 *   assault-site NPCs (Ostingele Tectum, Auga Hypophysis, Arnon Epithalamus)
 *   in the assault and headquarters systems, and next to none in the
 *   vanguards. The headquarters NPCs (Outuni Mesen, Deltole Tegmentum) kill
 *   in Jayai's and Jakemhih's headquarters, and the Yulai Crus Cerebi that
 *   farm rookie ships do so in four of these headquarters (171 of the 182
 *   such kills since 2015).
 *
 * The wiki rows this was checked against are licensed under the Creative
 * Commons Attribution-ShareAlike 4.0 licence
 * (https://creativecommons.org/licenses/by-sa/4.0/), and so is this data.
 */

import type { IncursionSiteRole } from "./siteRoles";

export const INFERRED_SYSTEMS_BY_ROLE: Record<
  IncursionSiteRole,
  readonly number[]
> = {
  vanguard: [
    30000283, 30000284, 30000285, 30000286, 30000460, 30000462, 30000465,
    30000757, 30000758, 30000762, 30000763, 30001119, 30001120, 30001122,
    30001123, 30001148, 30001150, 30001151, 30001215, 30001216, 30001218,
    30001821, 30001822, 30001824, 30002978, 30002979, 30002981, 30003199,
    30003200, 30003203, 30003559, 30003562, 30003564, 30003636, 30003640,
    30003641, 30003643, 30004256, 30004259, 30004260, 30004261, 30004262,
    30004263, 30004264, 30004494, 30004496, 30004498, 30004499, 30004547,
    30004548, 30004549, 30004551, 30004760, 30004761, 30004765, 30004774,
    30004775, 30004777, 30004868, 30004869, 30004871,
  ],
  assault: [
    30000281, 30000282, 30000287, 30000464, 30000756, 30000759, 30001117,
    30001118, 30001124, 30001149, 30001214, 30001818, 30001819, 30002976,
    30002977, 30003198, 30003201, 30003561, 30003638, 30003639, 30004254,
    30004257, 30004258, 30004266, 30004497, 30004500, 30004545, 30004546,
    30004759, 30004762, 30004773, 30004867,
  ],
  headquarters: [
    30000280, 30000461, 30000760, 30001125, 30001147, 30001213, 30001820,
    30002975, 30003197, 30003560, 30003637, 30004255, 30004493, 30004544,
    30004764, 30004772, 30004866,
  ],
};
