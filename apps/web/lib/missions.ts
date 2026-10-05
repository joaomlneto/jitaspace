/**
 * Presentation rules for SDE agent missions (missions.yaml) and the dungeons
 * they run in.
 *
 * Pure and dependency-free, so the server routes and the client pages agree on
 * what a mission is called, how its messages are ordered, and how the
 * placeholders in its text read.
 */

/** typeID 29 is "Credits": a mission reward of this type is an ISK payout. */
export const ISK_TYPE_ID = 29;

export type MissionKind = "kill" | "courier" | "other";

export const MISSION_KIND_LABELS: Record<MissionKind, string> = {
  kill: "Encounter",
  courier: "Courier",
  other: "Other",
};

/**
 * A mission's kind, from which objective block missions.yaml gives it. Every
 * mission has at most one: `killMission` (an encounter in a dungeon, optionally
 * with an item to retrieve) or `courierMission` (an item to haul). The rest are
 * talk-to-agent and storyline steps with no objective of their own.
 */
export function missionKind(mission: {
  killDungeonId: number | null;
  killObjectiveTypeId: number | null;
  killObjectiveQuantity: number | null;
  killDropItemInMissionContainerTypeId: number | null;
  courierObjectiveTypeId: number | null;
  courierObjectiveQuantity: number | null;
}): MissionKind {
  // Any column of the flattened block means the block was there: one mission
  // carries a `killMission` holding nothing but `objectiveQuantity: 0`.
  if (
    mission.killDungeonId !== null ||
    mission.killObjectiveTypeId !== null ||
    mission.killObjectiveQuantity !== null ||
    mission.killDropItemInMissionContainerTypeId !== null
  ) {
    return "kill";
  }
  if (
    mission.courierObjectiveTypeId !== null ||
    mission.courierObjectiveQuantity !== null
  ) {
    return "courier";
  }
  return "other";
}

/**
 * What to call a dungeon: its dungeons.yaml name, or its id for the many
 * mission dungeons dungeons.yaml does not describe.
 */
export function dungeonDisplayName(dungeon: {
  dungeonId: number;
  name: string | null;
}): string {
  return dungeon.name ?? `Dungeon ${dungeon.dungeonId}`;
}

/**
 * Format a span of minutes — the unit of every mission and epic arc interval in
 * the SDE (`expirationTime`, `bonusTimeInterval`, `arcRestartInterval`) — as
 * its two largest units: `10080` → "7 days", `90` → "1 hour 30 minutes".
 */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0 minutes";
  const units: [string, number][] = [
    ["day", 1440],
    ["hour", 60],
    ["minute", 1],
  ];
  const parts: string[] = [];
  let rest = Math.round(minutes);
  for (const [name, size] of units) {
    const count = Math.floor(rest / size);
    rest -= count * size;
    if (count > 0) parts.push(`${count} ${name}${count === 1 ? "" : "s"}`);
  }
  return parts.slice(0, 2).join(" ");
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type MissionMessageSection =
  | "briefing"
  | "dialogue"
  | "mail"
  | "journal";

export type MissionMessageSpeaker = "agent" | "pilot" | "text";

export interface MissionMessageSlot {
  key: string;
  label: string;
  section: MissionMessageSection;
  speaker: MissionMessageSpeaker;
  /** The conversation stage a dialogue line belongs to. */
  stage?: string;
}

const P = "messages.mission.";

/**
 * Every message slot missions.yaml uses, in the order a pilot meets them: the
 * briefing; then the agent conversation, stage by stage; then the mails the
 * game sends when an offer or a mission lapses; then an epic arc's journal.
 */
export const MISSION_MESSAGE_SLOTS: readonly MissionMessageSlot[] = [
  {
    key: `${P}briefing`,
    label: "Briefing",
    section: "briefing",
    speaker: "text",
  },
  {
    key: `${P}extrainfo.header`,
    label: "Additional Information",
    section: "briefing",
    speaker: "text",
  },
  {
    key: `${P}extrainfo.body`,
    label: "Additional Information",
    section: "briefing",
    speaker: "text",
  },

  {
    key: "messages.root.agentsays",
    label: "Greeting",
    section: "dialogue",
    speaker: "agent",
    stage: "Offer",
  },
  {
    key: `${P}ask.charsays`,
    label: "Asks for work",
    section: "dialogue",
    speaker: "pilot",
    stage: "Offer",
  },
  {
    key: `${P}offered.agentsays`,
    label: "Offers the mission",
    section: "dialogue",
    speaker: "agent",
    stage: "Offer",
  },
  {
    key: `${P}option1.charsays`,
    label: "Option 1",
    section: "dialogue",
    speaker: "pilot",
    stage: "Offer",
  },
  {
    key: `${P}option2.charsays`,
    label: "Option 2",
    section: "dialogue",
    speaker: "pilot",
    stage: "Offer",
  },
  {
    key: `${P}option3.charsays`,
    label: "Option 3",
    section: "dialogue",
    speaker: "pilot",
    stage: "Offer",
  },
  {
    key: `${P}option4.charsays`,
    label: "Option 4",
    section: "dialogue",
    speaker: "pilot",
    stage: "Offer",
  },
  {
    key: `${P}accept.charsays`,
    label: "Accepts",
    section: "dialogue",
    speaker: "pilot",
    stage: "Accept",
  },
  {
    key: `${P}accepted.agentsays`,
    label: "Accepted",
    section: "dialogue",
    speaker: "agent",
    stage: "Accept",
  },
  {
    key: "messages.root.missioninprogress.agentsays",
    label: "Mission in progress",
    section: "dialogue",
    speaker: "agent",
    stage: "In Progress",
  },
  {
    key: `${P}complete.charsays`,
    label: "Completes",
    section: "dialogue",
    speaker: "pilot",
    stage: "Complete",
  },
  {
    key: `${P}completed.agentsays`,
    label: "Completed",
    section: "dialogue",
    speaker: "agent",
    stage: "Complete",
  },
  {
    key: `${P}completed.nextmission.agentsays`,
    label: "Next mission",
    section: "dialogue",
    speaker: "agent",
    stage: "Complete",
  },
  {
    key: `${P}decline.charsays`,
    label: "Declines",
    section: "dialogue",
    speaker: "pilot",
    stage: "Decline",
  },
  {
    key: `${P}declined.agentsays`,
    label: "Declined",
    section: "dialogue",
    speaker: "agent",
    stage: "Decline",
  },
  {
    key: `${P}quit.charsays`,
    label: "Quits",
    section: "dialogue",
    speaker: "pilot",
    stage: "Quit",
  },
  {
    key: `${P}quitted.agentsays`,
    label: "Quit",
    section: "dialogue",
    speaker: "agent",
    stage: "Quit",
  },

  {
    key: `${P}offerexpired.email.header`,
    label: "Offer expired",
    section: "mail",
    speaker: "text",
  },
  {
    key: `${P}offerexpired.email.body`,
    label: "Offer expired",
    section: "mail",
    speaker: "text",
  },
  {
    key: `${P}timeout.emailheader`,
    label: "Mission timed out",
    section: "mail",
    speaker: "text",
  },
  {
    key: `${P}timeout.emailbody`,
    label: "Mission timed out",
    section: "mail",
    speaker: "text",
  },

  {
    key: "messages.epicMission.journalText.chapterTitle",
    label: "Chapter",
    section: "journal",
    speaker: "text",
  },
  {
    key: "messages.epicMission.journalText.inProgressMessage",
    label: "In progress",
    section: "journal",
    speaker: "text",
  },
  {
    key: "messages.epicMission.journalText.completedMessage",
    label: "Completed",
    section: "journal",
    speaker: "text",
  },
];

const SLOT_INDEX = new Map(
  MISSION_MESSAGE_SLOTS.map((slot, index) => [slot.key, index]),
);
const SLOT_BY_KEY = new Map(
  MISSION_MESSAGE_SLOTS.map((slot) => [slot.key, slot]),
);

/**
 * The slot a message key fills. A key the SDE adds later still renders, as a
 * plain-text line at the end of the dialogue labelled with its own id.
 */
export function missionMessageSlot(key: string): MissionMessageSlot {
  const slot = SLOT_BY_KEY.get(key);
  if (slot) return slot;
  const label = key.replace(/^messages\./, "");
  return { key, label, section: "dialogue", speaker: "text", stage: "Other" };
}

/** Sort key for a message: known slots in conversation order, unknown last. */
export function missionMessageRank(key: string): number {
  return SLOT_INDEX.get(key) ?? MISSION_MESSAGE_SLOTS.length;
}

// ---------------------------------------------------------------------------
// Text placeholders
// ---------------------------------------------------------------------------

/**
 * The values a mission's text can be filled in with, keyed by the variable its
 * placeholders name (`objectiveTypeID`, `agentID`, `rewardQuantity`, …).
 * Anything missing renders as a labelled placeholder instead.
 */
export type MissionTextValues = Partial<Record<string, string | number>>;

/** Readable names for the variables mission text refers to. */
const VARIABLE_LABELS: Record<string, string> = {
  player: "Pilot",
  agentID: "Agent",
  agentCorpID: "Agent's Corporation",
  agentFactionID: "Agent's Faction",
  agentStationID: "Agent's Station",
  agentSolarSystemID: "Agent's System",
  agentConstellationID: "Agent's Constellation",
  agentRegionID: "Agent's Region",
  dungeonLocationID: "Mission Location",
  dungeonSolarSystemID: "Mission System",
  objectiveLocationID: "Pickup Location",
  objectiveLocationSystemID: "Pickup System",
  objectiveDestinationID: "Destination",
  objectiveDestinationSystemID: "Destination System",
  objectiveTypeID: "Objective Item",
  objectiveQuantity: "Quantity",
  rewardTypeID: "Reward",
  rewardQuantity: "Reward Quantity",
};

/** `dungeonSolarSystemID` → "Dungeon Solar System". */
function humanizeVariable(variable: string): string {
  return variable
    .replace(/ID$/, "")
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

export function missionVariableLabel(variable: string): string {
  return VARIABLE_LABELS[variable] ?? humanizeVariable(variable);
}

const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const formatValue = (value: string | number) =>
  typeof value === "number" ? value.toLocaleString("en-US") : value;

/**
 * EVE's localization placeholders: `{[kind]variable.property}`, optionally
 * followed by `, arg=variable` pairs — e.g. `{[location]dungeonLocationID.name}`
 * or `{[item]objectiveTypeID.quantityName, quantity=objectiveQuantity}`.
 */
const PLACEHOLDER = /\{\[(\w+)\]([\w.]+)((?:\s*,\s*\w+=\w+)*)\}/g;

/**
 * Replace each placeholder in `text` with `known(value)` when `values` has it,
 * else with `unknown(label)`.
 */
function fillPlaceholders(
  text: string,
  values: MissionTextValues,
  known: (value: string) => string,
  unknown: (label: string) => string,
): string {
  return text.replaceAll(
    PLACEHOLDER,
    (_match, kind: string, path: string, rawArgs: string) => {
      const dot = path.lastIndexOf(".");
      const variable = dot === -1 ? path : path.slice(0, dot);
      const property = dot === -1 ? "" : path.slice(dot + 1);
      const args: Record<string, string> = {};
      for (const [, name, argVariable] of rawArgs.matchAll(/(\w+)=(\w+)/g)) {
        if (name !== undefined && argVariable !== undefined) {
          args[name] = argVariable;
        }
      }

      const value = values[variable];
      if (value === undefined) return unknown(missionVariableLabel(variable));

      let rendered = formatValue(value);
      if (kind === "item" && property === "quantityName") {
        const quantity =
          args.quantity === undefined ? undefined : values[args.quantity];
        if (quantity !== undefined) {
          rendered = `${formatValue(quantity)} x ${rendered}`;
        }
      } else if (property === "nameWithArticle") {
        rendered = `the ${rendered}`;
      }
      return known(rendered);
    },
  );
}

/**
 * Mission text as HTML for the EVE rich-text viewer: newlines become `<br>`,
 * and each placeholder becomes its value in bold when `values` knows it, or its
 * label in brackets, in italics, when it does not ("[Mission Location]") — the
 * game fills those in from the live offer, which the SDE cannot know.
 */
export function renderMissionText(
  text: string,
  values: MissionTextValues = {},
): string {
  return fillPlaceholders(
    text.replaceAll(/\r?\n/g, "<br>"),
    values,
    (value) => `<b>${escapeHtml(value)}</b>`,
    (label) => `<i>[${escapeHtml(label)}]</i>`,
  );
}

/**
 * The same fill as {@link renderMissionText}, as text: values verbatim and
 * labels in brackets, with no markup added and nothing escaped. For contexts
 * that strip markup but never decode entities, such as a meta description.
 */
export function missionPlainText(
  text: string,
  values: MissionTextValues = {},
): string {
  return fillPlaceholders(
    text,
    values,
    (value) => value,
    (label) => `[${label}]`,
  );
}
