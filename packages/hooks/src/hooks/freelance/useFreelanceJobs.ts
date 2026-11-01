"use client";

import { useQuery } from "@tanstack/react-query";

import type { GetFreelanceJobsListingQueryParams } from "@jitaspace/esi-client";
import {
  getFreelanceJobsListing,
  getFreelanceJobsListingQueryKey,
} from "@jitaspace/esi-client";

import type { FreelanceJob } from "./freelanceJobTypes";
import {
  ESI_CURSOR_PAGE_SIZE,
  esiCursorQueryOptions,
} from "../utils/esiCursorQueryOptions";
import { EAGER_WALK_STALE_TIME_MS } from "../utils/useEagerlyFetchAllPages";

export interface FreelanceJobsFilter {
  /** Only the jobs this corporation created. */
  corporationId?: number;
  /**
   * Include jobs that have finished — completed, closed, expired or deleted.
   *
   * Off by default, and costly without `corporationId`: active jobs are a few
   * pages, but every job ever is ~200 and growing, past the walk's ceiling. See
   * `EsiCursorDirection` for why the two are different walks.
   */
  includeFinished?: boolean;
}

/** Query options for the public listing, shared by the hook and prefetching. */
export function freelanceJobsQueryOptions(filter: FreelanceJobsFilter = {}) {
  const { corporationId, includeFinished = false } = filter;
  const direction = includeFinished ? "after" : "before";
  const params: GetFreelanceJobsListingQueryParams = {
    limit: ESI_CURSOR_PAGE_SIZE,
    ...(corporationId === undefined ? {} : { corporation_id: corporationId }),
    [direction]: "0",
  };

  return esiCursorQueryOptions({
    queryKey: getFreelanceJobsListingQueryKey(params),
    direction,
    fetchPage: (cursor, signal) =>
      getFreelanceJobsListing({ ...params, [direction]: cursor }, undefined, {
        signal,
      }),
    items: (data) => data.freelance_jobs,
  });
}

/**
 * Every public freelance job — by default the active ones, which is what the
 * in-game board lists. Needs no login.
 */
export function useFreelanceJobs(
  filter: FreelanceJobsFilter & { enabled?: boolean } = {},
) {
  const { enabled = true, ...rest } = filter;
  return useQuery<FreelanceJob[], Error>({
    ...freelanceJobsQueryOptions(rest),
    enabled,
    // Each refetch re-walks every page, and the board moves on the scale of
    // minutes, not seconds.
    staleTime: EAGER_WALK_STALE_TIME_MS,
  });
}
