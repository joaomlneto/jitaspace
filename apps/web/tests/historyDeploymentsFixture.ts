/**
 * Build-row fixtures for tests that mock `@jitaspace/db-builds`.
 *
 * The history readers place a build from its `BuildDeployment` rows
 * (`~/lib/history-build-placement`), not from the deprecated `Build.server` /
 * `Build.releasedAt`. Most fixtures still describe a build the old way, by the
 * one server that showed it and when, so {@link withDeployments} adds the
 * matching single deployment. A fixture can list `deployments` itself instead,
 * e.g. for a build promoted from Singularity to Tranquility.
 *
 * Mock factories are hoisted above imports, so require this inside the mocked
 * function body rather than importing it at the top of the test.
 */
export interface FixtureDeployment {
  server: "tranquility" | "singularity";
  firstSeenAt: Date | null;
}

export interface FixtureBuild {
  releasedAt?: Date | null;
  server?: "tranquility" | "singularity" | null;
  deployments?: FixtureDeployment[];
}

export function withDeployments<T extends FixtureBuild>(
  row: T,
): T & { deployments: FixtureDeployment[] } {
  if (row.deployments) return { ...row, deployments: row.deployments };
  // A dated row without a server is the old marker for an SDE-era build: in
  // the live database every such build has a Tranquility deployment, which is
  // what the SDE ingest writes. An undated one without a server gets none.
  const releasedAt = row.releasedAt ?? null;
  const server = row.server ?? (releasedAt ? "tranquility" : null);
  return {
    ...row,
    deployments: server ? [{ server, firstSeenAt: releasedAt }] : [],
  };
}
