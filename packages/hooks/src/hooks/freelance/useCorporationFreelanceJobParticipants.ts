"use client";

import { useQuery } from "@tanstack/react-query";

import type { GetCorporationsFreelanceJobsParticipantsQueryParams } from "@jitaspace/esi-client";
import {
  getCorporationsFreelanceJobsParticipants,
  getCorporationsFreelanceJobsParticipantsQueryKey,
} from "@jitaspace/esi-client";

import type { FreelanceJobParticipant } from "./freelanceJobTypes";
import { useAccessToken } from "../auth";
import {
  ESI_CURSOR_PAGE_SIZE,
  esiCursorQueryOptions,
} from "../utils/esiCursorQueryOptions";
import { EAGER_WALK_STALE_TIME_MS } from "../utils/useEagerlyFetchAllPages";
import {
  CORPORATION_FREELANCE_JOBS_SCOPE,
  FREELANCE_JOB_MANAGER_ROLES,
  isFreelanceJobId,
} from "./freelanceJobTypes";

const PARAMS: GetCorporationsFreelanceJobsParticipantsQueryParams = {
  limit: ESI_CURSOR_PAGE_SIZE,
  after: "0",
};

/**
 * Everyone who has joined one of a corporation's freelance jobs, including
 * those who resigned or were kicked, with what each contributed.
 *
 * Only the corporation that created the job can read this, through a
 * character holding the Project_Manager role.
 */
export function useCorporationFreelanceJobParticipants(
  corporationId: number | undefined,
  jobId: string | undefined,
) {
  const { accessToken, authHeaders } = useAccessToken({
    corporationId,
    scopes: [CORPORATION_FREELANCE_JOBS_SCOPE],
    roles: FREELANCE_JOB_MANAGER_ROLES,
  });

  return useQuery<FreelanceJobParticipant[], Error>({
    ...esiCursorQueryOptions({
      queryKey: getCorporationsFreelanceJobsParticipantsQueryKey(
        corporationId,
        jobId,
        PARAMS,
      ),
      direction: "after",
      fetchPage: (cursor, request) =>
        getCorporationsFreelanceJobsParticipants(
          corporationId ?? 0,
          jobId ?? "",
          { ...PARAMS, after: cursor },
          authHeaders,
          request,
        ),
      items: (data) => data.participants,
      key: (participant) => participant.id,
    }),
    enabled:
      corporationId !== undefined &&
      isFreelanceJobId(jobId) &&
      accessToken !== null,
    staleTime: EAGER_WALK_STALE_TIME_MS,
  });
}
