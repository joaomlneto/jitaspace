/**
 * Writes plain-language descriptions of dogma effects into
 * `DogmaEffect.customDescription`, for effects whose CCP description is empty
 * or the "Automatically generated effect" placeholder. Claude Opus 5.5 writes
 * them from each effect's modifiers; the effect and item pages show them,
 * labelled AI-generated, wherever CCP's own text is missing.
 *
 *   pnpm --filter @jitaspace/background-jobs describe-dogma-effects <command>
 *
 * Commands (reads the root .env: DATABASE_URL, ANTHROPIC_API_KEY):
 *   count                       how many effects lack a description
 *   payload <effectId>          print the model's input for one effect
 *   sample <effectId…>          describe a few effects now; prints, writes nothing
 *   submit [--all]              send every candidate to the Message Batches API
 *                               (--all: also effects that already have one)
 *   collect <batchId>           read a finished batch; redo failures one by one;
 *                               save the results to <outDir>/<batchId>.json
 *   write <file> [--overwrite]  store the results (--overwrite: replace
 *                               existing descriptions, else fill empty ones)
 *
 * After `write`, run the revalidate-sde-cache job: the pages read this column
 * under cacheSdeRead(), which only the SDE ingest refreshes.
 *
 * What a description may say, learned with the site owner:
 * - what changes, on which items, in which direction, and how it scales with
 *   skills — but never the items that carry the effect, nor any values: the
 *   effect page lists every carrier with its own value;
 * - plain text plus links (<a href="showinfo:TYPEID">, or a site path for a
 *   group, attribute or effect), and only to ids found in the input.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

import type {
  EffectInput,
  Ref,
  Result,
} from "../utils/dogmaEffectDescriptions";
import { prisma } from "../db";
import {
  BOILERPLATE,
  checkDescription,
  directionOf,
  label,
  OPERATIONS,
  SKILL_CATEGORY_ID,
  SYSTEM_PROMPT,
} from "../utils/dogmaEffectDescriptions";

const MODEL = "claude-opus-5-5";
const OUT_DIR = join(
  process.cwd(),
  "node_modules/.cache/describe-dogma-effects",
);

/** Hull bonus attribute → the ship skills that multiply it by their level. */
function skillsScaling(
  rows: {
    modifiedAttributeId: number | null;
    effect: {
      TypeEffect: {
        type: {
          typeId: number;
          name: string;
          group: { categoryId: number };
        };
      }[];
    };
  }[],
): Map<number, Ref[]> {
  const scaledBy = new Map<number, Ref[]>();
  for (const { modifiedAttributeId, effect } of rows) {
    if (modifiedAttributeId === null) continue;
    const skills = scaledBy.get(modifiedAttributeId) ?? [];
    for (const { type } of effect.TypeEffect) {
      const known = skills.some((skill) => skill.id === type.typeId);
      if (type.group.categoryId === SKILL_CATEGORY_ID && !known) {
        skills.push({ id: type.typeId, name: type.name });
      }
    }
    if (skills.length > 0) scaledBy.set(modifiedAttributeId, skills);
  }
  return scaledBy;
}

/** The model's input for each effect, from the database. */
async function loadInputs(effectIds: number[]): Promise<EffectInput[]> {
  const effects = await prisma.dogmaEffect.findMany({
    where: { effectId: { in: effectIds } },
    select: {
      effectId: true,
      name: true,
      displayName: true,
      effectCategory: { select: { name: true } },
      isOffensive: true,
      isAssistance: true,
      isWarpSafe: true,
      disallowAutoRepeat: true,
      electronicChance: true,
      propulsionChance: true,
      rangeChance: true,
      dischargeAttributeId: true,
      durationAttributeId: true,
      rangeAttributeId: true,
      falloffAttributeId: true,
      trackingSpeedAttributeId: true,
    },
  });
  const modifiers = await prisma.dogmaEffectModifier.findMany({
    where: { effectId: { in: effectIds }, isDeleted: false },
    orderBy: [{ effectId: "asc" }, { modifierIndex: "asc" }],
    select: {
      effectId: true,
      func: true,
      domain: true,
      operator: true,
      modifiedAttributeId: true,
      modifyingAttributeId: true,
      groupId: true,
      group: { select: { name: true } },
      skillTypeId: true,
      targetEffectId: true,
      targetEffect: { select: { name: true, displayName: true } },
    },
  });
  const carriers = await prisma.typeEffect.findMany({
    where: { effectId: { in: effectIds }, isDeleted: false },
    select: {
      effectId: true,
      typeId: true,
      type: {
        select: { published: true, group: { select: { categoryId: true } } },
      },
    },
  });

  const attributeIds = new Set<number>();
  for (const e of effects) {
    for (const id of [
      e.dischargeAttributeId,
      e.durationAttributeId,
      e.rangeAttributeId,
      e.falloffAttributeId,
      e.trackingSpeedAttributeId,
    ]) {
      if (id !== null) attributeIds.add(id);
    }
  }
  const modifyingIds = new Set<number>();
  for (const m of modifiers) {
    if (m.modifiedAttributeId !== null) attributeIds.add(m.modifiedAttributeId);
    if (m.modifyingAttributeId !== null) {
      attributeIds.add(m.modifyingAttributeId);
      modifyingIds.add(m.modifyingAttributeId);
    }
  }

  const [attributes, skills, values, scaling] = await Promise.all([
    prisma.dogmaAttribute.findMany({
      where: { attributeId: { in: [...attributeIds] } },
      select: {
        attributeId: true,
        name: true,
        displayName: true,
        unitId: true,
      },
    }),
    prisma.type.findMany({
      where: {
        typeId: {
          in: modifiers.flatMap((m) =>
            m.skillTypeId === null ? [] : [m.skillTypeId],
          ),
        },
      },
      select: { typeId: true, name: true },
    }),
    prisma.typeAttribute.findMany({
      where: {
        attributeId: { in: [...modifyingIds] },
        isDeleted: false,
        type: {
          effects: { some: { effectId: { in: effectIds }, isDeleted: false } },
        },
      },
      select: { typeId: true, attributeId: true, value: true },
    }),
    // Hull bonus attributes a ship skill multiplies by its trained level.
    prisma.dogmaEffectModifier.findMany({
      where: {
        isDeleted: false,
        func: "ItemModifier",
        domain: "shipID",
        operator: { in: [0, 4] },
        modifiedAttributeId: { in: [...modifyingIds] },
        modifyingAttribute: { name: "skillLevel" },
      },
      select: {
        modifiedAttributeId: true,
        effect: {
          select: {
            TypeEffect: {
              where: { isDeleted: false },
              select: {
                type: {
                  select: {
                    typeId: true,
                    name: true,
                    group: { select: { categoryId: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const attributeById = new Map(attributes.map((a) => [a.attributeId, a]));
  const attributeRef = (id: number | null): Ref | null => {
    if (id === null) return null;
    const a = attributeById.get(id);
    return { id, name: a ? label(a.displayName, a.name, id) : `#${id}` };
  };
  const skillName = new Map(skills.map((s) => [s.typeId, s.name]));
  const valuesByType = new Map<string, number>(
    values.map((v) => [`${v.typeId}:${v.attributeId}`, v.value]),
  );
  const scaledBy = skillsScaling(scaling);

  return effects.map((e): EffectInput => {
    const own = carriers.filter((c) => c.effectId === e.effectId);
    // Values that count: published carriers' non-zero values, or every
    // carrier's when none is published (NPC-only effects).
    const counted = (attributeId: number): number[] => {
      const all = own.flatMap((c) => {
        const v = valuesByType.get(`${c.typeId}:${attributeId}`);
        return v === undefined || v === 0
          ? []
          : [{ published: c.type.published, v }];
      });
      const published = all.filter((x) => x.published);
      return (published.length > 0 ? published : all).map((x) => x.v);
    };
    const uses: Record<string, Ref> = {};
    const stat = (key: string, id: number | null) => {
      const ref = attributeRef(id);
      if (ref) uses[key] = ref;
    };
    stat("activation cost", e.dischargeAttributeId);
    stat("cycle time", e.durationAttributeId);
    stat("optimal range", e.rangeAttributeId);
    stat("falloff", e.falloffAttributeId);
    stat("tracking", e.trackingSpeedAttributeId);

    return {
      effectId: e.effectId,
      effect: {
        internalName: e.name,
        displayName: e.displayName,
        category: e.effectCategory?.name.replace(/^dgmEff/, "") ?? null,
        trueFlags: Object.entries({
          isOffensive: e.isOffensive,
          isAssistance: e.isAssistance,
          isWarpSafe: e.isWarpSafe,
          disallowAutoRepeat: e.disallowAutoRepeat,
          electronicChance: e.electronicChance,
          propulsionChance: e.propulsionChance,
          rangeChance: e.rangeChance,
        }).flatMap(([key, value]) => (value === true ? [key] : [])),
        usesAttributes: uses,
      },
      modifiers: modifiers
        .filter((m) => m.effectId === e.effectId)
        .map((m) => ({
          func: m.func,
          domain: m.domain,
          operation:
            m.operator === null
              ? null
              : (OPERATIONS[m.operator] ?? `operator ${m.operator}`),
          modifiedAttribute: attributeRef(m.modifiedAttributeId),
          modifyingAttribute: attributeRef(m.modifyingAttributeId),
          direction: directionOf(
            m.operator,
            m.modifyingAttributeId === null
              ? []
              : counted(m.modifyingAttributeId),
            m.modifiedAttributeId === null
              ? null
              : (attributeById.get(m.modifiedAttributeId)?.unitId ?? null),
          ),
          scalesWithSkills:
            m.modifyingAttributeId === null
              ? []
              : (scaledBy.get(m.modifyingAttributeId) ?? []),
          group:
            m.groupId === null
              ? null
              : { id: m.groupId, name: m.group?.name ?? `#${m.groupId}` },
          skill:
            m.skillTypeId === null
              ? null
              : {
                  id: m.skillTypeId,
                  name: skillName.get(m.skillTypeId) ?? `#${m.skillTypeId}`,
                },
          stoppedEffect:
            m.targetEffectId === null
              ? null
              : {
                  id: m.targetEffectId,
                  name: label(
                    m.targetEffect?.displayName ?? null,
                    m.targetEffect?.name ?? null,
                    m.targetEffectId,
                  ),
                },
        })),
      itemsAreSkills:
        own.length > 0 &&
        own.every((c) => c.type.group.categoryId === SKILL_CATEGORY_ID),
    };
  });
}

/** Effects with modifiers and no real CCP description. */
async function candidateIds(includeDescribed: boolean): Promise<number[]> {
  const rows = await prisma.dogmaEffect.findMany({
    where: {
      isDeleted: false,
      DogmaEffectModifiers: { some: { isDeleted: false } },
      ...(includeDescribed ? {} : { customDescription: null }),
    },
    select: { effectId: true, description: true },
    orderBy: { effectId: "asc" },
  });
  return rows
    .filter((r) => {
      const d = r.description?.trim() ?? "";
      return d === "" || d === BOILERPLATE;
    })
    .map((r) => r.effectId);
}

function requestParams(input: EffectInput) {
  return {
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "medium" as const },
    system: [
      {
        type: "text" as const,
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [
      {
        role: "user" as const,
        content: JSON.stringify(
          {
            effect: input.effect,
            modifiers: input.modifiers,
            itemsAreSkills: input.itemsAreSkills,
          },
          null,
          1,
        ),
      },
    ],
  };
}

const textOf = (content: { type: string; text?: string }[]) =>
  content
    .flatMap((b) => (b.type === "text" && b.text ? [b.text] : []))
    .join("")
    .trim();

/** One effect, now, with server-side fallbacks and one retry on a problem. */
async function describeNow(
  client: Anthropic,
  input: EffectInput,
): Promise<string | null> {
  const params = requestParams(input);
  const message = await client.beta.messages.create({
    ...params,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (message.stop_reason === "refusal") return null;
  const first = textOf(message.content);
  const problem = checkDescription(first, input);
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
  return checkDescription(second, input) ? null : second;
}

async function submit(includeDescribed: boolean) {
  const ids = await candidateIds(includeDescribed);
  const inputs = await loadInputs(ids);
  const batch = await new Anthropic().messages.batches.create({
    requests: inputs.map((input) => ({
      custom_id: `effect-${input.effectId}`,
      params: requestParams(input),
    })),
  });
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`submitted ${inputs.length} effects as ${batch.id}`);
}

async function collect(batchId: string) {
  const client = new Anthropic();
  const batch = await client.messages.batches.retrieve(batchId);
  if (batch.processing_status !== "ended") {
    console.log(batch.processing_status, batch.request_counts);
    return;
  }
  const texts = new Map<number, string>();
  for await (const r of await client.messages.batches.results(batchId)) {
    const effectId = Number(r.custom_id.replace("effect-", ""));
    texts.set(
      effectId,
      r.result.type === "succeeded" &&
        r.result.message.stop_reason === "end_turn"
        ? textOf(r.result.message.content)
        : "",
    );
  }
  const inputs = await loadInputs([...texts.keys()]);
  const results: Result[] = [];
  let redone = 0;
  const skipped: number[] = [];
  for (const input of inputs) {
    let text: string | null = texts.get(input.effectId) ?? "";
    if (checkDescription(text, input)) {
      redone++;
      text = await describeNow(client, input);
    }
    if (text) results.push({ effectId: input.effectId, description: text });
    else skipped.push(input.effectId);
  }
  results.sort((a, b) => a.effectId - b.effectId);
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
async function write(file: string, overwrite: boolean) {
  const results = JSON.parse(readFileSync(file, "utf8")) as Result[];
  let written = 0;
  for (let i = 0; i < results.length; i += 500) {
    const chunk = results.slice(i, i + 500);
    const values = chunk
      .map((_, j) => `($${2 * j + 1}::int, $${2 * j + 2}::text)`)
      .join(", ");
    written += await prisma.$executeRawUnsafe(
      `UPDATE "DogmaEffect" AS e SET "customDescription" = v.d
       FROM (VALUES ${values}) AS v(id, d)
       WHERE e."effectId" = v.id${overwrite ? "" : ' AND e."customDescription" IS NULL'}`,
      ...chunk.flatMap((r) => [r.effectId, r.description]),
    );
  }
  console.log(
    `wrote ${written} of ${results.length}. Now run the revalidate-sde-cache job.`,
  );
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const flag = (name: string) => args.includes(name);
  const positional = args.filter((a) => !a.startsWith("--"));
  switch (command) {
    case "count":
      console.log(
        `${(await candidateIds(false)).length} effects need a description`,
      );
      break;
    case "payload":
      console.log(
        JSON.stringify(await loadInputs(positional.map(Number)), null, 1),
      );
      break;
    case "sample": {
      const client = new Anthropic();
      for (const input of await loadInputs(positional.map(Number))) {
        console.log(input.effectId, await describeNow(client, input));
      }
      break;
    }
    case "submit":
      await submit(flag("--all"));
      break;
    case "collect":
      await collect(positional[0] ?? "");
      break;
    case "write":
      await write(positional[0] ?? "", flag("--overwrite"));
      break;
    default:
      console.error(
        "usage: describe-dogma-effects count | payload <id…> | sample <id…> | submit [--all] | collect <batchId> | write <file> [--overwrite]",
      );
      process.exitCode = 1;
  }
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
