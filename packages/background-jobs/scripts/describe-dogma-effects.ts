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

import { prisma } from "../db";

const MODEL = "claude-opus-5-5";
const BOILERPLATE = "Automatically generated effect";
const SKILL_CATEGORY_ID = 16;
/** Resonance unit: a lower value means more resistance. */
const RESONANCE_UNIT_ID = 108;
const MAX_VISIBLE_CHARS = 280;
const OUT_DIR = join(
  process.cwd(),
  "node_modules/.cache/describe-dogma-effects",
);

const SYSTEM_PROMPT = `You write short descriptions of EVE Online dogma effects for JitaSpace, a reference website. CCP gave these effects no description. Players read your text directly above the effect's raw modifier data, and the page lists every item that has the effect together with its own value.

Write one or two sentences, about 150 and never more than 240 visible characters. Say what the effect does in game terms: what changes, on which items, and in which direction.

Format: plain text with links, and no other markup. Link the first mention of each skill, item, group, attribute and effect you name, using its id from the input and exactly one of these forms:
- a skill or item type: <a href="showinfo:TYPEID">Name</a>
- a group: <a href="/group/GROUPID">Name</a>
- a dogma attribute: <a href="/dogma/attribute/ATTRIBUTEID">Name</a>
- a dogma effect: <a href="/dogma/effect/EFFECTID">Name</a>
Only link ids that appear in the input. Never write other tags, entities or markdown.

Rules:
- Use only the data provided. Do not add game mechanics that are not in it (warp core stability, stacking penalties, overheating, capacitor use, how or when a module is activated). If the data cannot tell you something, leave it out.
- No numbers: no values, ranges, percentages, multipliers or counts. The page shows each item's value.
- Never name or describe the items that have the effect: no "carried by", "found on" or "used by", and no ship, module, implant, skill or NPC names for them. Call the item with the effect "the item", "the module", "the implant", "the skill" and so on.
- Name attributes by their display name. Use an internal camelCase name only when it is the only name there is.
- Do not begin with "This effect", and do not repeat the effect's internal name.
- direction says what the effect does to the modified attribute as players see it: "increases", "decreases", "increases or decreases" (it depends on the item), or "sets" (it overrides the value). Use it for your verb. When it is null, say the attribute is changed or modified.
- When scalesWithSkill is set, the bonus grows with that skill's level: say it applies "per <a href="showinfo:TYPEID">Skill Name</a> level". When itemsAreSkills is true, the bonus applies per skill level.
- Say only what the effect does. Do not restate its flags or the attributes under usesAttributes unless they are needed to explain it, and do not state what the effect does not do.

How to read a modifier:
- domain says where the targets are. shipID: the hull the item is fitted to (normally a ship; for starbase modules, the control tower; for structure modules, the structure). structureID: the structure. charID: the pilot. itemID: the item that has the effect itself, not the ship. otherID: the charge loaded in this module, or the module this charge is loaded in. targetID and target: whatever the item is activated on.
- func says which items. ItemModifier: the domain itself. LocationModifier: everything fitted to or located in the domain. LocationGroupModifier: items of the given group in the domain. LocationRequiredSkillModifier: items in the domain that require the given skill. OwnerRequiredSkillModifier: items owned by the pilot that require the given skill, wherever they are, including drones, missiles and fighters in space. EffectStopper: stops the named effect on the domain and changes no attribute.
- operation, in the order dogma applies them: PreAssign sets the base value; PreMul multiplies; PreDiv divides; ModAdd adds; ModSub subtracts; PostMul multiplies; PostDiv divides; PostPercent changes by a percentage; PostAssign overrides the final value.

Reply with the description only.`;

const OPERATIONS: Record<number, string> = {
  [-1]: "PreAssign",
  0: "PreMul",
  1: "PreDiv",
  2: "ModAdd",
  3: "ModSub",
  4: "PostMul",
  5: "PostDiv",
  6: "PostPercent",
  7: "PostAssign",
};

interface Ref {
  id: number;
  name: string;
}

interface ModifierInput {
  func: string;
  domain: string | null;
  operation: string | null;
  modifiedAttribute: Ref | null;
  modifyingAttribute: Ref | null;
  direction: string | null;
  scalesWithSkill: Ref | null;
  group: Ref | null;
  skill: Ref | null;
  stoppedEffect: Ref | null;
}

interface EffectInput {
  effectId: number;
  effect: {
    internalName: string | null;
    displayName: string | null;
    category: string | null;
    trueFlags: string[];
    usesAttributes: Record<string, Ref>;
  };
  modifiers: ModifierInput[];
  itemsAreSkills: boolean;
}

interface Result {
  effectId: number;
  description: string;
}

/** What a modifier does to the modified attribute, as players read it. */
function directionOf(
  operator: number | null,
  values: number[],
  modifiedUnitId: number | null,
): string | null {
  if (operator === -1 || operator === 7) return "sets";
  if (operator === null) return null;
  const raises = (value: number): boolean | null => {
    switch (operator) {
      case 0:
      case 4:
        return value === 1 ? null : value > 1;
      case 1:
      case 5:
        return value === 1 ? null : value < 1;
      case 2:
      case 6:
        return value === 0 ? null : value > 0;
      case 3:
        return value === 0 ? null : value < 0;
      default:
        return null;
    }
  };
  const seen = new Set(
    values.map(raises).filter((x): x is boolean => x !== null),
  );
  if (seen.size === 0) return null;
  if (seen.size === 2) return "increases or decreases";
  const up = [...seen][0] !== (modifiedUnitId === RESONANCE_UNIT_ID);
  return up ? "increases" : "decreases";
}

/** Display name, else internal name, else the id; blanks count as missing. */
function label(displayName: string | null, name: string | null, id: number) {
  const display = displayName?.trim();
  if (display) return display;
  return name ?? `#${id}`;
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
  const scaledBy = new Map<number, Ref>();
  for (const s of scaling) {
    if (s.modifiedAttributeId === null) continue;
    const skill = s.effect.TypeEffect.find(
      (te) => te.type.group.categoryId === SKILL_CATEGORY_ID,
    )?.type;
    if (skill)
      scaledBy.set(s.modifiedAttributeId, {
        id: skill.typeId,
        name: skill.name,
      });
  }

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
          scalesWithSkill:
            m.modifyingAttributeId === null
              ? null
              : (scaledBy.get(m.modifyingAttributeId) ?? null),
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

/** Every link id the input mentions, by link kind. */
function linkableIds(input: EffectInput): Set<string> {
  const ids = new Set<string>([`/dogma/effect/${input.effectId}`]);
  const attr = (ref: Ref | null) =>
    ref && ids.add(`/dogma/attribute/${ref.id}`);
  Object.values(input.effect.usesAttributes).forEach(attr);
  for (const m of input.modifiers) {
    attr(m.modifiedAttribute);
    attr(m.modifyingAttribute);
    if (m.group) ids.add(`/group/${m.group.id}`);
    if (m.skill) ids.add(`showinfo:${m.skill.id}`);
    if (m.scalesWithSkill) ids.add(`showinfo:${m.scalesWithSkill.id}`);
    if (m.stoppedEffect) ids.add(`/dogma/effect/${m.stoppedEffect.id}`);
  }
  return ids;
}

/**
 * Why a description must be redone, or null when it is fine: it may only hold
 * text and links to ids from its own input, and stay short.
 */
function problemWith(text: string, input: EffectInput): string | null {
  const allowed = linkableIds(input);
  const withoutLinks = text.replace(
    /<a href="([^"<>]+)">([^<>]+)<\/a>/g,
    (_, href: string, inner: string) => {
      if (!allowed.has(href)) throw new Error(`link to ${href}`);
      return inner;
    },
  );
  if (/[<>]/.test(withoutLinks)) return "markup other than links";
  if (/&[#a-z0-9]+;/i.test(withoutLinks)) return "HTML entity";
  if (/\d/.test(withoutLinks.replace(/[A-Za-z_]+\d+[A-Za-z_\d]*/g, ""))) {
    return "a number";
  }
  if (withoutLinks.length === 0) return "empty";
  if (withoutLinks.length > MAX_VISIBLE_CHARS) return "too long";
  return null;
}

function check(text: string, input: EffectInput): string | null {
  try {
    return problemWith(text, input);
  } catch (error) {
    return error instanceof Error ? error.message : "invalid link";
  }
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
  const problem = check(first, input);
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
  return check(second, input) ? null : second;
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
    if (check(text, input)) {
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

async function write(file: string, overwrite: boolean) {
  const results = JSON.parse(readFileSync(file, "utf8")) as Result[];
  let written = 0;
  for (let i = 0; i < results.length; i += 200) {
    const counts = await prisma.$transaction(
      results.slice(i, i + 200).map(({ effectId, description }) =>
        prisma.dogmaEffect.updateMany({
          where: overwrite
            ? { effectId }
            : { effectId, customDescription: null },
          data: { customDescription: description },
        }),
      ),
    );
    written += counts.reduce((sum, c) => sum + c.count, 0);
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

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
