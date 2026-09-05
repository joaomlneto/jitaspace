/**
 * A record from the SDE's `npcCharacters.yaml`, narrowed to the fields the agent
 * ingest reads. Raw SDE values are `unknown`, so callers coerce through the
 * `sdeFields` accessors rather than trusting these shapes.
 */
export interface SdeNpcCharacterRecord {
  locationID?: unknown;
  agent?: {
    agentTypeID?: unknown;
    divisionID?: unknown;
    level?: unknown;
    isLocator?: unknown;
  };
  skills?: { typeID?: unknown }[];
  // Present on only a minority of NPC characters.
  ceo?: unknown;
  startDate?: unknown;
  careerID?: unknown;
  schoolID?: unknown;
  specialityID?: unknown;
}

/**
 * Whether the SDE gave this NPC character an `agent` block at all.
 *
 * `npcCharacters.yaml` covers every NPC character, not just agents, and omits
 * the whole `agent` block on the ones that are not agents. Those must not
 * produce an Agent row: `optionalNumber(record.agent?.agentTypeID)` collapses
 * the missing container to `null`, which the required-field guard in
 * `scrape-sde-agents` then treats as corrupt data and throws on — aborting the
 * job, and with it `bootstrap-database`.
 */
export const hasAgentData = (npcCharacter: SdeNpcCharacterRecord) =>
  npcCharacter.agent !== undefined;

/** Agent type 4 is the research agent that offers datacore research. */
export const isResearchAgent = (npcCharacter: SdeNpcCharacterRecord) =>
  Number(npcCharacter.agent?.agentTypeID) === 4;
