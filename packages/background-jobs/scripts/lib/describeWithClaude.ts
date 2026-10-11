/**
 * The command line shared by the scripts that write `customDescription` with
 * Claude (describe-dogma-effects, describe-dogma-attributes). A script
 * supplies a {@link Describer}: what it describes, its prompt, how to build
 * each input and check each answer; this runs the rest.
 *
 *   count                       how many rows still lack a description
 *   payload <id…>               print the model's input for some rows
 *   sample <id…>                describe a few rows now; prints, writes nothing
 *   submit [--all]              send every candidate to the Message Batches API
 *                               (--all: also rows that already have one)
 *   collect <batchId>           read a finished batch; redo failures one by one;
 *                               save the results to <outDir>/<batchId>.json
 *   write <file> [--overwrite]  store the results (--overwrite: replace
 *                               existing descriptions, else fill empty ones)
 *
 * Reads the root .env (DATABASE_URL, ANTHROPIC_API_KEY). The pages that show
 * these descriptions cache them for a day; run the revalidate-sde-cache job
 * after `write` to show them at once.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

import { prisma } from "../../db";

const MODEL = "claude-opus-5-5";
const OUT_DIR = join(process.cwd(), "node_modules/.cache/describe-with-claude");

export interface Describer<I> {
  /** "effect" or "attribute": the batch's custom_id prefix and log noun. */
  noun: string;
  /** The table and id column `write` updates. */
  table: "DogmaEffect" | "DogmaAttribute";
  idColumn: "effectId" | "attributeId";
  systemPrompt: string;
  idOf: (input: I) => number;
  /** What the model reads: the input without anything it must not see. */
  userContent: (input: I) => unknown;
  /** Why a description must be redone, or null when it is fine. */
  check: (text: string, input: I) => string | null;
  loadInputs: (ids: number[]) => Promise<I[]>;
  candidateIds: (includeDescribed: boolean) => Promise<number[]>;
}

interface Result {
  id: number;
  description: string;
}

function requestParams<I>(d: Describer<I>, input: I) {
  return {
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "medium" as const },
    system: [
      {
        type: "text" as const,
        text: d.systemPrompt,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [
      {
        role: "user" as const,
        content: JSON.stringify(d.userContent(input), null, 1),
      },
    ],
  };
}

const textOf = (content: { type: string; text?: string }[]) =>
  content
    .flatMap((b) => (b.type === "text" && b.text ? [b.text] : []))
    .join("")
    .trim();

/** One row, now, with server-side fallbacks and one retry on a problem. */
async function describeNow<I>(
  client: Anthropic,
  d: Describer<I>,
  input: I,
): Promise<string | null> {
  const params = requestParams(d, input);
  const message = await client.beta.messages.create({
    ...params,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (message.stop_reason === "refusal") return null;
  const first = textOf(message.content);
  const problem = d.check(first, input);
  if (!problem) return first;
  const retry = await client.beta.messages.create({
    ...params,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [
      ...params.messages,
      { role: "assistant", content: message.content },
      {
        role: "user",
        content: `That has ${problem}. Rewrite it following every rule.`,
      },
    ],
  });
  const second = retry.stop_reason === "refusal" ? "" : textOf(retry.content);
  return d.check(second, input) ? null : second;
}

async function submit<I>(d: Describer<I>, includeDescribed: boolean) {
  const inputs = await d.loadInputs(await d.candidateIds(includeDescribed));
  const batch = await new Anthropic().messages.batches.create({
    requests: inputs.map((input) => ({
      custom_id: `${d.noun}-${d.idOf(input)}`,
      params: requestParams(d, input),
    })),
  });
  console.log(`submitted ${inputs.length} ${d.noun}s as ${batch.id}`);
}

async function collect<I>(d: Describer<I>, batchId: string) {
  const client = new Anthropic();
  const batch = await client.messages.batches.retrieve(batchId);
  if (batch.processing_status !== "ended") {
    console.log(batch.processing_status, batch.request_counts);
    return;
  }
  const texts = new Map<number, string>();
  for await (const r of await client.messages.batches.results(batchId)) {
    const { result } = r;
    texts.set(
      Number(r.custom_id.slice(d.noun.length + 1)),
      result.type === "succeeded" && result.message.stop_reason === "end_turn"
        ? textOf(result.message.content)
        : "",
    );
  }
  const results: Result[] = [];
  const skipped: number[] = [];
  let redone = 0;
  // One at a time on purpose: redos are few, and this keeps the API calm.
  for (const input of await d.loadInputs([...texts.keys()])) {
    const id = d.idOf(input);
    let text: string | null = texts.get(id) ?? "";
    if (d.check(text, input)) {
      redone++;
      text = await describeNow(client, d, input);
    }
    if (text) results.push({ id, description: text });
    else skipped.push(id);
  }
  results.sort((a, b) => a.id - b.id);
  mkdirSync(OUT_DIR, { recursive: true });
  const file = join(OUT_DIR, `${batchId}.json`);
  writeFileSync(file, JSON.stringify(results, null, 1));
  console.log(
    `${results.length} descriptions in ${file}; ${redone} redone one by one; skipped: ${skipped.join(", ") || "none"}`,
  );
}

/**
 * One `UPDATE … FROM (VALUES …)` per chunk rather than a row-by-row
 * transaction, which runs past Prisma's interactive-transaction timeout.
 */
async function write<I>(d: Describer<I>, file: string, overwrite: boolean) {
  const results = JSON.parse(readFileSync(file, "utf8")) as Result[];
  let written = 0;
  // Chunk by chunk on purpose: one statement at a time keeps the load low.
  for (let i = 0; i < results.length; i += 500) {
    const chunk = results.slice(i, i + 500);
    const values = chunk
      .map((_, j) => `($${2 * j + 1}::int, $${2 * j + 2}::text)`)
      .join(", ");
    written += await prisma.$executeRawUnsafe(
      `UPDATE "${d.table}" AS t SET "customDescription" = v.d
       FROM (VALUES ${values}) AS v(id, d)
       WHERE t."${d.idColumn}" = v.id${overwrite ? "" : ' AND t."customDescription" IS NULL'}`,
      ...chunk.flatMap((r) => [r.id, r.description]),
    );
  }
  console.log(
    `wrote ${written} of ${results.length}. Run the revalidate-sde-cache job to show them at once.`,
  );
}

/** Runs one command line against `d`, then closes the database. */
export async function runDescriber<I>(d: Describer<I>, argv: string[]) {
  const [command, ...args] = argv;
  const flag = (name: string) => args.includes(name);
  const positional = args.filter((a) => !a.startsWith("--"));
  try {
    switch (command) {
      case "count":
        console.log(
          `${(await d.candidateIds(false)).length} ${d.noun}s need a description`,
        );
        break;
      case "payload":
        for (const input of await d.loadInputs(positional.map(Number))) {
          console.log(JSON.stringify(d.userContent(input), null, 1));
        }
        break;
      case "sample": {
        const client = new Anthropic();
        // One at a time on purpose: a sample is a handful of rows.
        for (const input of await d.loadInputs(positional.map(Number))) {
          console.log(d.idOf(input), await describeNow(client, d, input));
        }
        break;
      }
      case "submit":
        await submit(d, flag("--all"));
        break;
      case "collect":
        await collect(d, positional[0] ?? "");
        break;
      case "write":
        await write(d, positional[0] ?? "", flag("--overwrite"));
        break;
      default:
        console.error(
          "commands: count | payload <id…> | sample <id…> | submit [--all] | collect <batchId> | write <file> [--overwrite]",
        );
        process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}
