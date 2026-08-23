import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
// `zodOutputFormat` is typed against Zod 4, which ships inside the pinned Zod
// 3.25 as the `zod/v4` subpath. Importing the package root here gives a Zod 3
// schema the helper's signature rejects.
import * as z from "zod/v4";

import type { BuildDigest } from "./digest";
import { formatBuildDigest } from "./digest";

/**
 * Turns a build's change digest into the one sentence the site shows for it.
 *
 * A single Messages API call — not an agent. Builds are immutable and rare (a
 * handful a month), so this runs once per build and the result is stored; there
 * is no loop to run and nothing to explore.
 */

/** The model used. Recorded on every row so a bad batch can be found later. */
export const SUMMARY_MODEL = "claude-opus-5";

/**
 * Bump when {@link SYSTEM_PROMPT} or the digest format changes in a way that
 * should invalidate existing summaries. Stored per row so old ones can be found
 * and regenerated.
 */
export const PROMPT_VERSION = 1;

/** Hard ceiling. The card clamps to two lines, so an essay would be cut off anyway. */
export const MAX_SUMMARY_LENGTH = 200;

const SYSTEM_PROMPT = `You write one-sentence summaries of EVE Online client patches for a fan site.

You are given a factual digest of what a build changed: per-dataset counts and a sample of real entity names. Write a single sentence describing it, for a player skimming a list of builds.

Rules:
- State only what the digest says. Never infer or invent gameplay effects, balance intent, ship roles, lore, or anything about entities not listed.
- Prefer naming a few concrete things from the samples over listing every category.
- Plain, factual register. No marketing language, no hype, no "exciting"/"major"/"significant", no exclamation marks.
- One sentence, at most ${MAX_SUMMARY_LENGTH} characters, ending in a full stop.
- Do not open with the build number or the date — the page already shows both.
- If the digest is dominated by one dataset, say so plainly rather than padding with the small ones.`;

const SummarySchema = z.object({
  summary: z
    .string()
    .describe(
      "One factual sentence describing what this build changed, at most " +
        `${MAX_SUMMARY_LENGTH} characters.`,
    ),
});

/** Collapses whitespace and enforces the length ceiling; null if unusable. */
export function validateSummary(
  text: string | null | undefined,
): string | null {
  const cleaned = text?.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  if (cleaned.length > MAX_SUMMARY_LENGTH) return null;
  return cleaned;
}

export interface SummarizeOptions {
  apiKey: string;
  /** Injectable for tests; defaults to a client built from `apiKey`. */
  client?: Anthropic;
}

/**
 * Generates the sentence for one build.
 *
 * Returns `null` rather than throwing when the model declines or returns
 * something unusable — the caller stores nothing and the site falls back to its
 * static wording, which is a fine outcome for a decorative sentence.
 */
export async function summarizeBuild(
  digest: BuildDigest,
  { apiKey, client = new Anthropic({ apiKey }) }: SummarizeOptions,
): Promise<string | null> {
  const response = await client.messages.parse({
    model: SUMMARY_MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: formatBuildDigest(digest) }],
    output_config: { format: zodOutputFormat(SummarySchema) },
  });

  // A safety decline is a normal outcome here, not an error to retry.
  if (response.stop_reason === "refusal") return null;

  return validateSummary(response.parsed_output?.summary);
}
