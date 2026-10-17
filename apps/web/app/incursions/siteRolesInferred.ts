/**
 * Site types for the constellations no source maps cleanly.
 *
 * First, 17 constellations that ESI has listed incursions in since
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
 *   farm rookie ships do so in four of these headquarters (172 of the 186
 *   such kills since 2015 in the systems checked).
 *
 * It also lays out 24 constellations that last had an incursion before
 * 2022-12, which neither map covers either: eve-incursions.de names only the
 * staging system, and the wiki's rows for most of them list nothing else.
 * With no ESI listing to go by, their infested systems are those in the
 * staging system's security band, as they are in 452 of the 458
 * constellations ESI has listed. Each is the layout the rule gives today;
 * their own incursions may have run on an older one, as Ganoure's and, by
 * the wiki's row, Q-PVMK's did. Vaarma, with no single staging system, gets
 * no layout here, and nor do the constellations Pochven took systems from
 * (Ihilakken and Kainokai keep the sites eve-incursions.de maps).
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
    30000045, 30000047, 30000263, 30000265, 30000266, 30000283, 30000284,
    30000285, 30000286, 30000460, 30000462, 30000465, 30000686, 30000688,
    30000690, 30000757, 30000758, 30000762, 30000763, 30000772, 30000775,
    30000776, 30000818, 30000819, 30000820, 30000821, 30000823, 30000867,
    30000870, 30000871, 30000944, 30000945, 30000946, 30001119, 30001120,
    30001122, 30001123, 30001148, 30001150, 30001151, 30001215, 30001216,
    30001218, 30001286, 30001289, 30001290, 30001670, 30001672, 30001674,
    30001750, 30001751, 30001753, 30001821, 30001822, 30001824, 30002030,
    30002033, 30002034, 30002154, 30002155, 30002156, 30002254, 30002481,
    30002485, 30002487, 30002489, 30002490, 30002492, 30002823, 30002825,
    30002826, 30002978, 30002979, 30002981, 30002983, 30002985, 30003193,
    30003194, 30003195, 30003199, 30003200, 30003203, 30003224, 30003225,
    30003227, 30003559, 30003562, 30003564, 30003636, 30003640, 30003641,
    30003643, 30003782, 30003783, 30003784, 30004256, 30004259, 30004260,
    30004261, 30004262, 30004263, 30004264, 30004310, 30004311, 30004315,
    30004319, 30004320, 30004321, 30004330, 30004331, 30004332, 30004374,
    30004375, 30004376, 30004494, 30004496, 30004498, 30004499, 30004547,
    30004548, 30004549, 30004551, 30004760, 30004761, 30004765, 30004774,
    30004775, 30004777, 30004868, 30004869, 30004871, 30005080,
  ],
  assault: [
    30000044, 30000261, 30000262, 30000281, 30000282, 30000287, 30000464,
    30000685, 30000756, 30000759, 30000770, 30000773, 30000815, 30000816,
    30000817, 30000869, 30000942, 30000943, 30001117, 30001118, 30001124,
    30001149, 30001214, 30001288, 30001669, 30001754, 30001818, 30001819,
    30002031, 30002153, 30002251, 30002482, 30002483, 30002484, 30002491,
    30002821, 30002822, 30002976, 30002977, 30002984, 30003192, 30003198,
    30003201, 30003226, 30003561, 30003638, 30003639, 30003781, 30004254,
    30004257, 30004258, 30004266, 30004312, 30004313, 30004318, 30004329,
    30004372, 30004373, 30004497, 30004500, 30004545, 30004546, 30004759,
    30004762, 30004773, 30004867, 30021672,
  ],
  headquarters: [
    30000049, 30000264, 30000280, 30000461, 30000689, 30000760, 30000774,
    30000814, 30000868, 30000947, 30001125, 30001147, 30001213, 30001287,
    30001673, 30001749, 30001820, 30002029, 30002157, 30002253, 30002486,
    30002820, 30002975, 30002987, 30003191, 30003197, 30003223, 30003560,
    30003637, 30003786, 30004255, 30004314, 30004317, 30004334, 30004371,
    30004493, 30004544, 30004764, 30004772, 30004866, 30005079,
  ],
};
