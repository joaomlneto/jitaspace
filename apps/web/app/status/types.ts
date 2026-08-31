/**
 * Must match SDE_INGEST_KEY in `@jitaspace/background-jobs`'
 * `jobs/scrape/sde/sdeIngestState.ts`. It is duplicated rather than imported
 * because that package pulls in Bull and the Trigger.dev SDK, which have no
 * place in the web bundle; `statusSdeIngestState.test.ts` asserts the two stay
 * in step so the marker can't drift out from under this page again.
 */
export const SDE_INGEST_KEY = "sde:ingest";

/** The subset of the background job's ingest marker this page renders. */
export interface SdeIngestState {
  buildNumber: number;
  /** ISO timestamp of when the ingest finished; null while one is in flight. */
  completedAt: string | null;
}

export interface SdeLastModifiedResponse {
  _key: "sde";
  buildNumber: number;
  releaseDate: string;
}

export interface VercelStatusResponse {
  page: {
    id: string;
    name: string;
    url: string;
    time_zone: string;
    updated_at: string;
  };
  status: {
    indicator: string;
    description: string;
  };
}
