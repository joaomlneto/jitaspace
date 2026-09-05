/**
 * The compact, factual description of a build's changes that the summarizer is
 * given to write from.
 *
 * A build can touch thousands of entities, which is far more than a one-sentence
 * summary needs and more than is worth paying to send. The digest is instead
 * per-collection counts plus a short sample of real names, so the model has
 * something concrete to name without being handed the whole diff.
 */

/** Per-collection tally for one build. */
export interface CollectionChangeCounts {
  /** Source dataset — `types`, `typeDogma`, `skins`, … */
  collection: string;
  added: number;
  modified: number;
  removed: number;
}

/** A few real names, so the sentence can mention something specific. */
export interface CollectionSample {
  collection: string;
  op: "added" | "modified" | "removed";
  names: string[];
}

export interface BuildDigest {
  build: number;
  /** Release date as `YYYY-MM-DD`, or null when unknown. */
  date: string | null;
  /** Build this one was diffed against; null for a genesis snapshot. */
  fromBuild: number | null;
  counts: CollectionChangeCounts[];
  samples: CollectionSample[];
}

/** Names listed per collection/op. Enough to be concrete, short enough to be cheap. */
export const SAMPLE_LIMIT = 20;

const OPS = ["added", "modified", "removed"] as const;

/** `+3 new · 5 changed · −1 removed`, skipping the zeroes. */
function countLine(c: CollectionChangeCounts): string {
  const parts: string[] = [];
  if (c.added > 0) parts.push(`${c.added} new`);
  if (c.modified > 0) parts.push(`${c.modified} changed`);
  if (c.removed > 0) parts.push(`${c.removed} removed`);
  return parts.join(", ");
}

/**
 * Renders a {@link BuildDigest} as the plain text handed to the model.
 *
 * Deliberately dull and literal: every number and name here comes from the
 * database, and the prompt tells the model it may not state anything this text
 * does not. Collections are ordered by how much they changed so the most
 * significant ones survive if the model only mentions a couple.
 */
export function formatBuildDigest(digest: BuildDigest): string {
  const total = (c: CollectionChangeCounts) => c.added + c.modified + c.removed;

  const lines: string[] = [
    `EVE client build ${digest.build}` +
      (digest.date ? `, released ${digest.date}` : "") +
      (digest.fromBuild === null
        ? " (first recorded build)"
        : `, compared with build ${digest.fromBuild}`) +
      ".",
    "",
  ];

  const ranked = digest.counts
    .filter((c) => total(c) > 0)
    .sort(
      (a, b) => total(b) - total(a) || a.collection.localeCompare(b.collection),
    );

  if (ranked.length === 0)
    return `${lines[0]}\n\nNothing changed in this build.`;

  const samplesFor = (collection: string, op: (typeof OPS)[number]) =>
    digest.samples.find((s) => s.collection === collection && s.op === op)
      ?.names ?? [];

  for (const counts of ranked) {
    lines.push(`${counts.collection}: ${countLine(counts)}`);
    for (const op of OPS) {
      const names = samplesFor(counts.collection, op);
      if (names.length === 0) continue;
      const shown = names.slice(0, SAMPLE_LIMIT);
      const more = names.length - shown.length;
      lines.push(
        `  ${op}: ${shown.join(", ")}${more > 0 ? `, and ${more} more` : ""}`,
      );
    }
  }

  return lines.join("\n");
}
