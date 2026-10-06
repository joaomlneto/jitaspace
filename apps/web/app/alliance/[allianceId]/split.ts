import type {
  AlliancePageData,
  AllianceProfile,
  AllianceTables,
} from "./types";
import { buildCorporationRows, summarizeCorporations } from "./corporations";
import { summarizeSovereignty } from "./sovereignty";

/** How many corporations the composition bar names before "others". */
export const COMPOSITION_SIZE = 8;

/**
 * Splits an alliance's profile into what the page carries (identity and
 * server-computed summaries) and the table rows `/api/alliance/[allianceId]`
 * serves when a tab needs them.
 */
export function splitAllianceProfile(profile: AllianceProfile): {
  page: AlliancePageData;
  tables: AllianceTables;
} {
  const { corporations, sovereignty, wars, ...identity } = profile;
  const rows = buildCorporationRows({
    corporations,
    esiMemberIds: undefined,
    executorCorporationId: profile.executorCorporationId,
    creatorCorporationId: profile.creatorCorporationId,
  });
  const executor = corporations.find(
    (corporation) =>
      corporation.corporationId === profile.executorCorporationId,
  );

  return {
    page: {
      ...identity,
      corporationSummary: summarizeCorporations(rows),
      composition: corporations
        .filter((corporation) => corporation.memberCount > 0)
        .sort((a, b) => b.memberCount - a.memberCount)
        .slice(0, COMPOSITION_SIZE)
        .map(({ corporationId, name, ticker, memberCount }) => ({
          corporationId,
          name,
          ticker,
          memberCount,
        })),
      executorCeo:
        executor?.ceoId == null
          ? null
          : { id: executor.ceoId, name: executor.ceoName },
      creatorStillMember: corporations.some(
        (corporation) =>
          corporation.corporationId === profile.creatorCorporationId,
      ),
      sovereigntySummary: summarizeSovereignty(sovereignty),
      listedWars: wars.length,
    },
    tables: { corporations, sovereignty, wars },
  };
}
