"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { GetCorporationsFreelanceJobsListingQueryParams } from "@jitaspace/esi-client";
import {
  getCorporationsFreelanceJobsListing,
  getCorporationsFreelanceJobsListingQueryKey,
} from "@jitaspace/esi-client";

import type { EsiSubject } from "../auth";
import type { EsiSubjectItem, MultiEsiQueryResult } from "../multi";
import type { SubjectQueryOptions } from "../multi/useEsiSubjectQueries";
import type { FreelanceJob } from "./freelanceJobTypes";
import { useAccessToken } from "../auth";
import { useEsiSubjectQueries } from "../multi/useEsiSubjectQueries";
import {
  ESI_CURSOR_PAGE_SIZE,
  esiCursorQueryOptions,
} from "../utils/esiCursorQueryOptions";
import { EAGER_WALK_STALE_TIME_MS } from "../utils/useEagerlyFetchAllPages";
import {
  CORPORATION_FREELANCE_JOBS_SCOPE,
  FREELANCE_JOB_MANAGER_ROLES,
} from "./freelanceJobTypes";

/**
 * Walks forwards from the start, which on the public listing is the walk that
 * includes finished jobs (see `EsiCursorDirection`). A corporation's managers
 * want its history, not only what is still running, and even a busy
 * corporation's history is a handful of pages: the most prolific public
 * creator had 1,371 jobs (14 pages) on 2026-10-30.
 */
const PARAMS: GetCorporationsFreelanceJobsListingQueryParams = {
  limit: ESI_CURSOR_PAGE_SIZE,
  after: "0",
};

/** Query options for one corporation's jobs, authorised by `authHeaders`. */
export function corporationFreelanceJobsQueryOptions(
  corporationId: number | undefined,
  authHeaders: Record<string, string>,
) {
  return esiCursorQueryOptions({
    queryKey: getCorporationsFreelanceJobsListingQueryKey(
      corporationId,
      PARAMS,
    ),
    direction: "after",
    fetchPage: (cursor, request) =>
      getCorporationsFreelanceJobsListing(
        corporationId ?? 0,
        { ...PARAMS, after: cursor },
        authHeaders,
        request,
      ),
    items: (data) => data.freelance_jobs,
    key: (job) => job.id,
  });
}

/**
 * Every freelance job a corporation has created, finished ones included, ACL
 * protected ones included.
 *
 * Needs a character in that corporation holding the Project_Manager role, with
 * both the corporation freelance scope and the roles scope granted.
 */
export function useCorporationFreelanceJobs(corporationId?: number) {
  const { accessToken, authHeaders } = useAccessToken({
    corporationId,
    scopes: [CORPORATION_FREELANCE_JOBS_SCOPE],
    roles: FREELANCE_JOB_MANAGER_ROLES,
  });

  return useQuery<FreelanceJob[], Error>({
    ...corporationFreelanceJobsQueryOptions(corporationId, authHeaders),
    enabled: corporationId !== undefined && accessToken !== null,
    staleTime: EAGER_WALK_STALE_TIME_MS,
  });
}

const buildCorporationJobsQuery = (subject: EsiSubject) =>
  ({
    ...corporationFreelanceJobsQueryOptions(subject.id, subject.authHeaders),
    staleTime: EAGER_WALK_STALE_TIME_MS,
    select: (jobs: FreelanceJob[]) =>
      jobs.map((job) => ({ ...job, subjectId: subject.id })),
  }) as unknown as SubjectQueryOptions<EsiSubjectItem<FreelanceJob>[]>;

/**
 * Several corporations' freelance jobs as one list, each tagged with its
 * corporation (`subjectId`).
 *
 * Omit `corporationIds` for every corporation a logged-in character manages
 * freelance jobs for. Corporations no logged-in character can read are skipped.
 */
export function useCorporationsFreelanceJobs(
  corporationIds?: readonly number[],
): MultiEsiQueryResult<FreelanceJob> {
  const { selected, ...envelope } = useEsiSubjectQueries(
    {
      kind: "corporation",
      scopes: [CORPORATION_FREELANCE_JOBS_SCOPE],
      roles: FREELANCE_JOB_MANAGER_ROLES,
      subjectIds: corporationIds,
    },
    buildCorporationJobsQuery,
  );

  const data = useMemo(
    () => selected.flatMap((jobs) => jobs ?? []),
    [selected],
  );

  return { ...envelope, data };
}
