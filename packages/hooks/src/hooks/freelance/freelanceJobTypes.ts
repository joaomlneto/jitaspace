import type {
  CharactersFreelanceJobsParticipation,
  CorporationsFreelanceJobsParticipantsParticipant,
  FreelanceJobsDetail,
  FreelanceJobsDetailFreelancejob,
} from "@jitaspace/esi-client";
import type { ESIScope } from "@jitaspace/esi-metadata";

/** A freelance job as the listings return it: name, state, progress, reward. */
export type FreelanceJob = FreelanceJobsDetailFreelancejob;

/** Everything ESI knows about one freelance job. */
export type FreelanceJobDetails = FreelanceJobsDetail;

/** One character's participation in a job, as that character reads it. */
export type FreelanceJobParticipation = CharactersFreelanceJobsParticipation;

/** One participant of a job, as its corporation's managers read it. */
export type FreelanceJobParticipant =
  CorporationsFreelanceJobsParticipantsParticipant;

export type FreelanceJobState = FreelanceJob["state"];

export const CHARACTER_FREELANCE_JOBS_SCOPE: ESIScope =
  "esi-characters.read_freelance_jobs.v1";

export const CORPORATION_FREELANCE_JOBS_SCOPE: ESIScope =
  "esi-corporations.read_freelance_jobs.v1";

/**
 * The role ESI's `x-required-roles` names for a corporation's freelance jobs
 * and their participants. Characters whose roles were never read (no
 * `esi-characters.read_corporation_roles.v1`) hold none, so they are not tried.
 */
export const FREELANCE_JOB_MANAGER_ROLES = ["Project_Manager" as const];

const FREELANCE_JOB_ID_PATTERN =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

/**
 * Whether `value` has the shape of a freelance job id (a UUID).
 *
 * The hooks only query ids that pass, so a mistyped URL is not sent to ESI —
 * which counts the resulting 404s against the client's error limit.
 */
export function isFreelanceJobId(value: unknown): value is string {
  return typeof value === "string" && FREELANCE_JOB_ID_PATTERN.test(value);
}
