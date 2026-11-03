import { cacheLife } from "next/cache";

import type {
  MilitaryCampaignsDetailCampaignStateEnum,
  MilitaryCampaignsObjectivesDetailObjective,
} from "@jitaspace/esi-client";
import {
  ESI_CURSOR_PAGE_LIMIT,
  fetchAllEsiCursorPages,
  getMilitaryCampaignsListing,
  getMilitaryCampaignsObjectivesListing,
} from "@jitaspace/esi-client";

export type MilitaryCampaignState = MilitaryCampaignsDetailCampaignStateEnum;

export interface MilitaryCampaignObjective {
  id: string;
  state: MilitaryCampaignState;
  progress: number;
  /** Everyone who ever joined, including those who resigned. */
  participantsTotal: number;
  /** Currently committed. */
  participantsCommitted: number;
  /** Contributed at least once. */
  participantsContributors: number;
  /** ISO timestamps. */
  started: string | null;
  finished: string | null;
  lastModified: string;
}

export interface MilitaryCampaign {
  id: string;
  state: MilitaryCampaignState;
  progress: number;
  /** ISO timestamps. */
  started: string | null;
  finished: string | null;
  objectives: MilitaryCampaignObjective[];
}

export interface MilitaryCampaignsSnapshot {
  /**
   * When ESI was read, taken inside the cached scope. Times shown relative to
   * "now" are measured from this: a client component calling `new Date()`
   * while the page prerenders would drop it out of the cached HTML.
   */
  readAt: string;
  campaigns: MilitaryCampaign[];
}

const toObjective = (
  objective: MilitaryCampaignsObjectivesDetailObjective,
): MilitaryCampaignObjective => ({
  id: objective.id,
  state: objective.state,
  progress: objective.progress,
  participantsTotal: objective.participants.total,
  participantsCommitted: objective.participants.committed,
  participantsContributors: objective.participants.contributors,
  started: objective.started ?? null,
  finished: objective.finished ?? null,
  lastModified: objective.last_modified,
});

/**
 * Every military campaign ESI lists, each with all of its objectives.
 *
 * ESI caches the listing for 60 seconds and the objectives not at all, so a
 * minute is as fresh as this can usefully be. Throws on any failure — the
 * page catches outside this scope, so an ESI blip is never what gets cached.
 */
export async function readMilitaryCampaigns(): Promise<MilitaryCampaignsSnapshot> {
  "use cache";
  cacheLife("minutes");

  const { data } = await getMilitaryCampaignsListing();
  const campaigns = await Promise.all(
    data.campaigns.map(async (campaign): Promise<MilitaryCampaign> => {
      const { data: objectives } = await fetchAllEsiCursorPages(
        (before) =>
          getMilitaryCampaignsObjectivesListing(campaign.id, {
            before,
            limit: ESI_CURSOR_PAGE_LIMIT,
          }),
        (page) => page.objectives,
      );
      return {
        id: campaign.id,
        state: campaign.state,
        progress: campaign.progress,
        started: campaign.started ?? null,
        finished: campaign.finished ?? null,
        objectives: objectives.map(toObjective),
      };
    }),
  );

  return { readAt: new Date().toISOString(), campaigns };
}
