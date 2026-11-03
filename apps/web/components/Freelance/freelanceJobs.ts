import type {
  FreelanceJob,
  FreelanceJobDetails,
  FreelanceJobParticipant,
  FreelanceJobState,
  ResolvableEntityCategory,
} from "@jitaspace/hooks";

/** Badge colour per job state. "Unspecified" is ESI's placeholder. */
export const FREELANCE_JOB_STATE_COLORS: Record<FreelanceJobState, string> = {
  Active: "green",
  Completed: "blue",
  Closed: "gray",
  Expired: "orange",
  Deleted: "red",
  Unspecified: "gray",
};

export const FREELANCE_JOB_STATES = Object.keys(
  FREELANCE_JOB_STATE_COLORS,
) as FreelanceJobState[];

export type FreelanceParticipantState = FreelanceJobParticipant["state"];

export const FREELANCE_PARTICIPANT_STATE_COLORS: Record<
  FreelanceParticipantState,
  string
> = {
  Committed: "green",
  Kicked: "red",
  Resigned: "gray",
  Unspecified: "gray",
};

/** How far a job is towards its goal, 0–100. A goal of zero counts as done. */
export function freelanceJobProgressPercent(
  job: Pick<FreelanceJob, "progress">,
) {
  const { current, desired } = job.progress;
  if (desired <= 0) return 100;
  // Multiplied first: 29 / 100 * 100 is 28.999…, which the label rounds down.
  return Math.min(100, Math.max(0, (current * 100) / desired));
}

/**
 * A job's progress as a whole percentage, rounded down so a job 99.6% done
 * does not read "100%" while it is still open. Below 1% it keeps one decimal,
 * and below 0.1% it reads "<0.1", so a started job never reads "0%".
 */
export function formatProgressPercent(percent: number): string {
  if (percent >= 100) return "100";
  if (percent <= 0) return "0";
  if (percent < 0.1) return "<0.1";
  if (percent < 1) return (Math.floor(percent * 10) / 10).toFixed(1);
  return String(Math.floor(percent));
}

/** ISK already paid out: what was reserved minus what is left. */
export function freelanceJobRewardPaid(job: Pick<FreelanceJob, "reward">) {
  if (!job.reward) return undefined;
  return Math.max(0, job.reward.initial - job.reward.remaining);
}

/**
 * `DeliverItem` → "Deliver item", `destroyed_identity` → "Destroyed identity".
 * The fallback for any identifier the tables below do not name, so a new
 * method or parameter still reads as words rather than code.
 */
export function humanizeIdentifier(identifier: string): string {
  const words = identifier
    .replaceAll("_", " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    // The last capital of a run starts the next word: NPCKill → NPC Kill.
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    // Acronyms (NPC, FW) keep their case; everything after the first word is
    // lower-cased like the in-game sentence-case labels.
    .map((word, index) =>
      /^[A-Z]{2,}$/.test(word) || index === 0 ? word : word.toLowerCase(),
    );
  const sentence = words.join(" ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/**
 * The contribution methods seen on live jobs (2026-10-30), worded as the task
 * a participant carries out. Anything else falls back to
 * {@link humanizeIdentifier}.
 */
const CONTRIBUTION_METHOD_LABELS: Record<string, string> = {
  BoostShield: "Boost shields",
  CaptureFWComplex: "Capture faction warfare complexes",
  DamageShip: "Damage ships",
  DefendFWComplex: "Defend faction warfare complexes",
  DeliverItem: "Deliver items",
  KillCapsuleer: "Destroy capsuleer ships",
  KillNPC: "Destroy NPCs",
  MineOre: "Mine ore",
  RepairArmor: "Repair armor",
  ShipInsurance: "Ship insurance",
};

export function contributionMethodLabel(method: string): string {
  return CONTRIBUTION_METHOD_LABELS[method] ?? humanizeIdentifier(method);
}

const PARAMETER_LABELS: Record<string, string> = {
  attacker_identity: "Attacker",
  boosted_identity: "Pilots to boost",
  boosted_ship: "Ships to boost",
  corporation_item_delivery: "Delivery",
  cover_implants: "Covers implants",
  damaged_identity: "Target",
  damaged_ship: "Target ship",
  destroyed_identity: "Target",
  destroyed_ship: "Target ship",
  empire_faction: "Faction",
  fw_complex_type: "Complex type",
  location: "Location",
  ore: "Ore",
  repaired_identity: "Pilots to repair",
  repaired_ship: "Ships to repair",
  require_capsuleer_involvement: "Requires capsuleer involvement",
  victim_ship: "Insured ship",
};

export function parameterLabel(key: string): string {
  return PARAMETER_LABELS[key] ?? humanizeIdentifier(key);
}

/**
 * The kinds of value a job parameter matches, and how to name them.
 *
 * `category` routes the id through the shared name cache and entity anchors.
 * `group` is an inventory group, which has its own page but no name in that
 * cache. The rest (FW complex archetypes, ship classes) have no page here, so
 * they are shown by id with their kind.
 */
export type ParameterValueKind =
  | { kind: "entity"; category: ResolvableEntityCategory }
  | { kind: "group" }
  | { kind: "other"; label: string };

const VALUE_TYPE_KINDS: Record<string, ParameterValueKind> = {
  alliance: { kind: "entity", category: "alliance" },
  character: { kind: "entity", category: "character" },
  constellation: { kind: "entity", category: "constellation" },
  corporation: { kind: "entity", category: "corporation" },
  faction: { kind: "entity", category: "faction" },
  item_type: { kind: "entity", category: "inventory_type" },
  ore_type: { kind: "entity", category: "inventory_type" },
  region: { kind: "entity", category: "region" },
  ship_type: { kind: "entity", category: "inventory_type" },
  solarsystem: { kind: "entity", category: "solar_system" },
  station: { kind: "entity", category: "station" },
  structure: { kind: "entity", category: "structure" },
  item_group: { kind: "group" },
  ore_group: { kind: "group" },
  ship_group: { kind: "group" },
};

export function parameterValueKind(valueType: string): ParameterValueKind {
  return (
    VALUE_TYPE_KINDS[valueType] ?? {
      kind: "other",
      label: humanizeIdentifier(valueType),
    }
  );
}

/** Values of one kind, as a matcher lists them. */
export interface ParameterValueGroup {
  valueType: string;
  values: string[];
}

/**
 * A job parameter, flattened from ESI's one-of wrapper into the shape the page
 * renders. A matcher with no values matches anything: ESI sends
 * `{ matcher: { values: [] } }` for "any location" or "any ship".
 */
export type DescribedParameter =
  | {
      kind: "matcher";
      key: string;
      label: string;
      groups: ParameterValueGroup[];
    }
  | { kind: "options"; key: string; label: string; selected: string[] }
  | { kind: "boolean"; key: string; label: string; value: boolean }
  | {
      kind: "delivery";
      key: string;
      label: string;
      items: ParameterValueGroup[];
      locations: ParameterValueGroup[];
    }
  | { kind: "unknown"; key: string; label: string };

type RawParameter = FreelanceJobDetails["configuration"]["parameters"][string];

const toGroups = (
  matcher: { values?: { value_type: string; values: string[] }[] } | undefined,
): ParameterValueGroup[] =>
  (matcher?.values ?? [])
    .filter((group) => group.values.length > 0)
    .map((group) => ({ valueType: group.value_type, values: group.values }));

export function describeParameter(
  key: string,
  parameter: RawParameter,
): DescribedParameter {
  const label = parameterLabel(key);
  if ("matcher" in parameter && parameter.matcher) {
    return { kind: "matcher", key, label, groups: toGroups(parameter.matcher) };
  }
  if ("options" in parameter && parameter.options) {
    return {
      kind: "options",
      key,
      label,
      selected: parameter.options.selected,
    };
  }
  if ("boolean" in parameter && parameter.boolean) {
    return { kind: "boolean", key, label, value: parameter.boolean.value };
  }
  if (
    "corporation_item_delivery" in parameter &&
    parameter.corporation_item_delivery
  ) {
    const delivery = parameter.corporation_item_delivery;
    return {
      kind: "delivery",
      key,
      label,
      items: toGroups(delivery.item_type),
      locations: toGroups(delivery.corporation_office_location),
    };
  }
  return { kind: "unknown", key, label };
}

/**
 * Every parameter of a job, in a stable order: what to do before where to do
 * it, so "Target" reads ahead of "Location".
 */
export function describeParameters(
  configuration: FreelanceJobDetails["configuration"],
): DescribedParameter[] {
  return Object.entries(configuration.parameters)
    .map(([key, parameter]) => describeParameter(key, parameter))
    .sort((a, b) => {
      const rank = (parameter: DescribedParameter) =>
        parameter.key === "location" ? 1 : 0;
      return rank(a) - rank(b) || a.label.localeCompare(b.label);
    });
}

/** Where a job in a merged "your jobs" list came from. */
export interface FreelanceJobSource {
  kind: "character" | "corporation";
  subjectId: number;
}

export const freelanceJobSourceKey = (source: FreelanceJobSource) =>
  `${source.kind}:${source.subjectId}`;

/** A job with every source that lists it. */
export type FreelanceJobRow = FreelanceJob & { sources: FreelanceJobSource[] };

/**
 * Merge several sources' listings into one row per job.
 *
 * The same job comes back once per character participating in it and once
 * more from the corporation that created it, and those copies may be read at
 * different moments — so the most recently modified copy is the one shown.
 */
export function mergeFreelanceJobs(
  listings: readonly {
    source: FreelanceJobSource;
    jobs: readonly FreelanceJob[];
  }[],
): FreelanceJobRow[] {
  const rows = new Map<string, FreelanceJobRow>();
  for (const { source, jobs } of listings) {
    for (const job of jobs) {
      const existing = rows.get(job.id);
      if (!existing) {
        rows.set(job.id, { ...job, sources: [source] });
        continue;
      }
      const sources = existing.sources.some(
        (known) =>
          freelanceJobSourceKey(known) === freelanceJobSourceKey(source),
      )
        ? existing.sources
        : [...existing.sources, source];
      const newer =
        Date.parse(job.last_modified) > Date.parse(existing.last_modified);
      rows.set(job.id, { ...(newer ? job : existing), sources });
    }
  }
  return [...rows.values()];
}

/**
 * The `?sources=` selection to store after the chips change: `null` (every
 * source, and no param in the URL) when everything is selected, so a shared
 * link does not freeze today's list of characters into it.
 */
export function nextFreelanceSourceSelection(
  selectedKeys: readonly string[],
  sources: readonly FreelanceJobSource[],
): string[] | null {
  const all = sources.map(freelanceJobSourceKey);
  const known = selectedKeys.filter((key) => all.includes(key));
  return known.length === all.length ? null : known;
}

/**
 * Which source keys are active: all of them with no selection in the URL, and
 * otherwise the selected ones this browser can actually read. A selection that
 * names none of them (a link from someone else, a character since logged out)
 * falls back to all, rather than an empty page with nothing to recover from.
 */
export function activeFreelanceSourceKeys(
  selectedKeys: readonly string[] | null,
  sources: readonly FreelanceJobSource[],
): Set<string> {
  const all = sources.map(freelanceJobSourceKey);
  if (selectedKeys === null) return new Set(all);
  const known = selectedKeys.filter((key) => all.includes(key));
  if (known.length === 0 && selectedKeys.length > 0) return new Set(all);
  return new Set(known);
}
