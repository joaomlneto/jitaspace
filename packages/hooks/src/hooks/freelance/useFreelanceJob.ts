"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  GetFreelanceJobsDetailQueryResponse,
  ResponseConfig,
  ResponseErrorConfig,
} from "@jitaspace/esi-client";
import {
  getFreelanceJobsDetail,
  getFreelanceJobsDetailQueryKey,
} from "@jitaspace/esi-client";

import type { FreelanceJobDetails } from "./freelanceJobTypes";
import { useAccessToken } from "../auth";
import { isFreelanceJobId } from "./freelanceJobTypes";

/**
 * Key for one job's details as a given viewer reads them.
 *
 * The generated key names only the job, but the response depends on who asks:
 * a job behind an ACL fails anonymously and succeeds for a participant or one
 * of the creator corporation's managers. Sharing the entry would let a cached
 * anonymous failure stand in for the authorised read, or the reverse.
 */
export function freelanceJobQueryKey(jobId: string, characterId?: number) {
  const generated = getFreelanceJobsDetailQueryKey(jobId);
  return characterId === undefined
    ? generated
    : ([...generated, { characterId }] as const);
}

/**
 * The details of one freelance job: description, requirements, contribution
 * rules, creator and where it is broadcast.
 *
 * Public jobs need no login, and are read anonymously unless `characterId` is
 * given. A job behind an ACL is visible only to its participants and the
 * creator corporation's freelance managers, so reading one needs the token of
 * such a character; ESI declares no scope for it.
 */
export function useFreelanceJob(
  jobId: string | undefined,
  options: { characterId?: number } = {},
) {
  const { characterId } = options;
  // Called unconditionally for the rules of hooks; without a `characterId` it
  // would pick any logged-in character, so its result is ignored then.
  const { accessToken, authHeaders } = useAccessToken({ characterId });
  const authenticated = characterId !== undefined;
  const validId = isFreelanceJobId(jobId);

  return useQuery<
    ResponseConfig<GetFreelanceJobsDetailQueryResponse>,
    ResponseErrorConfig<Error>,
    FreelanceJobDetails
  >({
    queryKey: freelanceJobQueryKey(jobId ?? "", characterId),
    queryFn: ({ signal }) =>
      getFreelanceJobsDetail(
        jobId ?? "",
        authenticated ? authHeaders : undefined,
        { signal },
      ),
    enabled: validId && (!authenticated || accessToken !== null),
    select: (response) => response.data,
  });
}
