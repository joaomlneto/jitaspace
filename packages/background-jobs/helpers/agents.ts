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
  /// The third tier of race/bloodline/ancestry; absent on a few hundred.
  ancestryID?: unknown;
  /// Whether the character's name is globally unique.
  uniqueName?: unknown;
  // Present on only a minority of NPC characters.
  ceo?: unknown;
  startDate?: unknown;
  careerID?: unknown;
  schoolID?: unknown;
  specialityID?: unknown;
}

/** Agent type 4 is the research agent that offers datacore research. */
export const isResearchAgent = (npcCharacter: SdeNpcCharacterRecord) =>
  Number(npcCharacter.agent?.agentTypeID) === 4;
