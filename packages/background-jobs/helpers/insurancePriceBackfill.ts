/**
 * Pure helpers of the `backfill-everef-insurance-prices` job, kept free of
 * runtime imports (p-limit, the env) so they can be unit-tested directly.
 */

export interface EveRefInsuranceFile {
  url: string;
  /** Equal etags mean equal contents. */
  etag: string;
  observedAt: Date;
}

/**
 * Groups the files to import into runs of one list each: consecutive files
 * with the same etag and no recorded observation between them. A run is
 * recorded as its first file's prices plus snapshots for the rest, so each
 * run costs one download and one diff, however many hours it spans.
 */
export function groupIntoRuns(
  files: readonly EveRefInsuranceFile[],
  recorded: readonly Date[],
): EveRefInsuranceFile[][] {
  const recordedTimes = new Set(recorded.map((at) => at.getTime()));
  const timeline = [
    ...files
      .filter((file) => !recordedTimes.has(file.observedAt.getTime()))
      .map((file) => ({ at: file.observedAt.getTime(), file })),
    ...[...recordedTimes].map((at) => ({ at, file: null })),
  ].sort((a, b) => a.at - b.at);

  const runs: EveRefInsuranceFile[][] = [];
  let run: EveRefInsuranceFile[] | null = null;
  for (const { file } of timeline) {
    if (file === null) {
      run = null;
    } else if (run?.[0]?.etag === file.etag) {
      run.push(file);
    } else {
      run = [file];
      runs.push(run);
    }
  }
  return runs;
}

/** UTC days from `from` to `to`, as EVE Ref's `YYYY/YYYY-MM-DD` paths. */
export function dayPaths(from: Date, to: Date): string[] {
  const paths: string[] = [];
  const day = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  for (; day <= to; day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0, 10);
    paths.push(`${date.slice(0, 4)}/${date}`);
  }
  return paths;
}
