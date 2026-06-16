import type { NpcCharacter } from "@jitaspace/sde-client";

export const isResearchAgent = (npcCharacter: NpcCharacter) => {
  return npcCharacter.agent.agentTypeID == 4;
};
