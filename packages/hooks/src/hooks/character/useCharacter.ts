"use client";

import { useMemo } from "react";

import type { CharactersDetailGenderEnum } from "@jitaspace/esi-client";
import { isIdInRanges, npcCharacterIdRanges } from "@jitaspace/esi-metadata";

import { useEsiCharacter } from "./useEsiCharacter";

export interface PlayerCharacter {
  allianceId?: number;
  birthday: Date | null;
  bloodlineId: number;
  corporationId: number;
  description?: string;
  factionId?: number;
  gender: CharactersDetailGenderEnum;
  name: string;
  raceId: number;
  securityStatus?: number;
  title?: string;
}

export interface AgentInSpace {
  dungeonId: number;
  solarSystemId: number;
  spawnPointId: number;
  typeId: number;
}

export interface ResearchAgent {
  researchSkills: number[];
}

export type AgentCharacter = {
  agentTypeId: number;
  corporationId: number;
  agentDivisionId: number;
  isLocator: boolean;
  isResearchAgent: boolean;
  researchSkills?: number[];
  level: number;
  locationId: number;
} & PlayerCharacter &
  (({ isInSpace: true } & AgentInSpace) | { isInSpace: false });

export type Character = (
  | ({
      type: "player";
    } & PlayerCharacter)
  | ({ type: "agent" } & AgentCharacter)
) & { isNpc: boolean };

/**
 * The agent half of a character, for the minority of characters that are NPC
 * agents. Only the SDE knows this, so it is read from our own database on the
 * server and passed in — the browser can't reach that data itself, and the vast
 * majority of characters are players with nothing to look up.
 *
 * Pass `null`/omit for a player character.
 */
export interface CharacterAgentData {
  agentTypeId: number;
  agentDivisionId: number;
  corporationId: number;
  isLocator: boolean;
  level: number;
  locationId: number;
  isResearchAgent: boolean;
  /** Type ids of the datacores a research agent offers. */
  researchSkills: number[];
  /** Set when the agent roams space rather than sitting in a station. */
  inSpace: AgentInSpace | null;
}

export const useCharacter = (
  characterId: number,
  agentData?: CharacterAgentData | null,
): {
  error: unknown;
  isError: boolean;
  isLoading: boolean;
  data?: Character;
} => {
  const esiCharacter = useEsiCharacter(characterId);

  const isNpc = useMemo(
    () => isIdInRanges(characterId, npcCharacterIdRanges),
    [characterId],
  );

  const characterBirthdayDate = useMemo(
    // Deps read through optional chaining, which the React Compiler check
    // cannot match against a hand-written list. Correct as written.
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    () =>
      esiCharacter.data?.data.birthday
        ? new Date(esiCharacter.data.data.birthday)
        : null,
    [esiCharacter.data?.data.birthday],
  );

  const researchAgentData:
    | (ResearchAgent & { isResearchAgent: true })
    | { isResearchAgent: false } = useMemo(
    // Deps read through optional chaining, which the React Compiler check
    // cannot match against a hand-written list. Correct as written.
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    () =>
      agentData?.isResearchAgent
        ? {
            isResearchAgent: true,
            researchSkills: agentData.researchSkills,
          }
        : { isResearchAgent: false },
    [agentData?.isResearchAgent, agentData?.researchSkills],
  );

  const agentInSpaceData:
    | (AgentInSpace & { isInSpace: true })
    | {
        isInSpace: false;
      } = useMemo(
    // Deps read through optional chaining, which the React Compiler check
    // cannot match against a hand-written list. Correct as written.
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    () =>
      agentData?.inSpace
        ? { isInSpace: true, ...agentData.inSpace }
        : { isInSpace: false },
    [agentData?.inSpace],
  );

  const mergedAgentData:
    | (AgentCharacter & { type: "agent"; isNpc: boolean })
    | null = useMemo(
    () =>
      agentData && esiCharacter.data
        ? {
            type: "agent",
            isNpc,
            agentTypeId: agentData.agentTypeId,
            agentDivisionId: agentData.agentDivisionId,
            birthday: characterBirthdayDate,
            bloodlineId: esiCharacter.data.data.bloodline_id,
            corporationId: agentData.corporationId,
            gender: esiCharacter.data.data.gender,
            isLocator: agentData.isLocator,
            level: agentData.level,
            locationId: agentData.locationId,
            name: esiCharacter.data.data.name,
            raceId: esiCharacter.data.data.race_id,
            description: esiCharacter.data.data.description,
            factionId: esiCharacter.data.data.faction_id,
            securityStatus: esiCharacter.data.data.security_status,
            title: esiCharacter.data.data.corporation_title,
            ...researchAgentData,
            ...agentInSpaceData,
          }
        : null,
    [
      agentData,
      researchAgentData,
      agentInSpaceData,
      isNpc,
      esiCharacter.data,
      characterBirthdayDate,
    ],
  );

  const mergedPlayerData:
    | (PlayerCharacter & { type: "player"; isNpc: boolean })
    | null = useMemo(
    () =>
      esiCharacter.data
        ? {
            type: "player",
            isNpc,
            birthday: characterBirthdayDate,
            bloodlineId: esiCharacter.data.data.bloodline_id,
            corporationId: esiCharacter.data.data.corporation_id,
            allianceId: esiCharacter.data.data.alliance_id,
            gender: esiCharacter.data.data.gender,
            name: esiCharacter.data.data.name,
            raceId: esiCharacter.data.data.race_id,
            description: esiCharacter.data.data.description,
            factionId: esiCharacter.data.data.faction_id,
            securityStatus: esiCharacter.data.data.security_status,
            title: esiCharacter.data.data.corporation_title,
          }
        : null,
    [esiCharacter.data, isNpc],
  );

  // The agent half arrives pre-resolved from the server, so ESI is the only
  // thing left that can be in flight or fail.
  const error = esiCharacter.error;
  const isError = esiCharacter.isError;

  const isLoading =
    esiCharacter.isLoading ||
    (!isError && !mergedAgentData && !mergedPlayerData);

  const data: Character | undefined = useMemo(
    () => mergedAgentData ?? mergedPlayerData ?? undefined,
    [mergedAgentData, mergedPlayerData],
  );

  return {
    error,
    isError,
    isLoading,
    data,
  };
};
