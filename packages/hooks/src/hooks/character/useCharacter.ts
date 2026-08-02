"use client";

import { useMemo } from "react";

import type { CharactersDetailGenderEnum } from "@jitaspace/esi-client";
import { isIdInRanges, npcCharacterIdRanges } from "@jitaspace/esi-metadata";

import { useEsiCharacter } from "./useEsiCharacter";
import { useSdeAgent } from "./useSdeAgent";

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
  agentDivisionName: string;
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

export const useCharacter = (
  characterId: number,
): {
  error: unknown;
  isError: boolean;
  isLoading: boolean;
  data?: Character;
} => {
  const esiCharacter = useEsiCharacter(characterId);

  // One lookup answers all three of "is this an agent?", "what kind?" and "is it
  // in space?" — a character with no Agent row simply resolves to null.
  const agent = useSdeAgent(characterId);
  const agentData = agent.data ?? null;

  const isNpc = useMemo(
    () => isIdInRanges(characterId, npcCharacterIdRanges),
    [characterId],
  );

  const characterBirthdayDate = useMemo(
    () =>
      esiCharacter.data?.data.birthday
        ? new Date(esiCharacter.data.data.birthday)
        : null,
    [esiCharacter.data?.data.birthday],
  );

  const researchAgentData:
    | (ResearchAgent & { isResearchAgent: true })
    | { isResearchAgent: false } = useMemo(
    () =>
      agentData?.isResearchAgent
        ? {
            isResearchAgent: true,
            researchSkills: agentData.researchSkills,
          }
        : { isResearchAgent: false },

    [agentData],
  );

  const agentInSpaceData:
    | (AgentInSpace & { isInSpace: true })
    | {
        isInSpace: false;
      } = useMemo(
    () =>
      agentData?.agentInSpace
        ? {
            isInSpace: true,
            dungeonId: agentData.agentInSpace.dungeonId,
            solarSystemId: agentData.agentInSpace.solarSystemId,
            spawnPointId: agentData.agentInSpace.spawnPointId,
            typeId: agentData.agentInSpace.typeId,
          }
        : { isInSpace: false },
    [agentData],
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
            agentDivisionName: agentData.agentDivisionName,
            birthday: characterBirthdayDate,
            bloodlineId: esiCharacter.data.data.bloodline_id,
            corporationId: agentData.corporationId,
            gender: esiCharacter.data.data.gender,
            isLocator: agentData.isLocator,
            level: agentData.level,
            locationId: agentData.stationId,
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

  const error = esiCharacter.error ?? agent.error;

  const isError = esiCharacter.isError || agent.isError;

  // The agent lookup has to settle before the player fallback can be trusted:
  // until it does we don't know whether this character is an agent, and
  // rendering the player shape first would flash the wrong corporation.
  const isLoading =
    esiCharacter.isLoading ||
    agent.isLoading ||
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
