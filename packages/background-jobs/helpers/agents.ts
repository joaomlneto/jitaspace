/**
 * The slice of an `npcCharacters.yaml` record the agent jobs read. Only NPC
 * characters that carry an `agent` block are agents — the file also lists plain
 * NPCs (corporation CEOs and the like), which have no `agent` key at all.
 */
export interface SdeNpcCharacter {
  agent?: {
    agentTypeID?: number;
    divisionID?: number;
    isLocator?: boolean;
    level?: number;
  };
  locationID: number;
  skills?: { typeID: number }[];
}

/** Agent type 4 is the research agent type. */
export const isResearchAgent = (npcCharacter: SdeNpcCharacter) => {
  return npcCharacter.agent?.agentTypeID === 4;
};
