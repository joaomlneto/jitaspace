"use client";

import { useMemo } from "react";

import { GetCharactersCharacterIdQueryResponseGender } from "@jitaspace/esi-client";
import { isIdInRanges, npcCharacterIdRanges } from "@jitaspace/esi-metadata";
import {
  useGetAgentInSpaceById,
  useGetAllAgentIds,
  useGetAllAgentInSpaceIds,
  useGetAllResearchAgentIds,
  useGetResearchAgentById,
} from "@jitaspace/sde-client";

import { useEsiCharacter } from "./useEsiCharacter";
import { useSdeAgent } from "./useSdeAgent";

export type PlayerCharacter = {
  allianceId?: number;
  birthday: Date | null;
  bloodlineId: number;
  corporationId: number;
  description?: string;
  factionId?: number;
  gender: GetCharactersCharacterIdQueryResponseGender;
  name: string;
  raceId: number;
  securityStatus?: number;
  title?: string;
};

export type AgentInSpace = {
  dungeonId: number;
  solarSystemId: number;
  spawnPointId: number;
  typeId: number;
};

export type ResearchAgent = {
  researchSkills: number[];
};

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

export const useCharacter = (
  characterId: number,
): {
  error: any;
  isError: boolean;
  isLoading: boolean;
  data?: Character;
} => {
  const esiCharacter = useEsiCharacter(characterId);

  const agentIds = useGetAllAgentIds();

  const isAgent = useMemo(
    () => agentIds.data?.data.includes(characterId) ?? false,
    [agentIds.data?.data, characterId],
  );

  const isNpc = useMemo(
    () => isIdInRanges(characterId, npcCharacterIdRanges),
    [characterId],
  );

  const agent = useSdeAgent(characterId, {
    query: {
      enabled: isAgent,
    },
  });

  const agentInSpaceIds = useGetAllAgentInSpaceIds({
    query: { enabled: isAgent },
  });

  const isAgentInSpace = useMemo(
    () => agentInSpaceIds.data?.data.includes(characterId) ?? false,
    [agentInSpaceIds.data?.data, characterId],
  );

  const agentInSpace = useGetAgentInSpaceById(characterId, {
    query: { enabled: isAgentInSpace },
  });

  const researchAgentIds = useGetAllResearchAgentIds({
    query: { enabled: isAgent },
  });

  const isResearchAgent = useMemo(
    () => researchAgentIds.data?.data.includes(characterId) ?? false,
    [researchAgentIds.data?.data, characterId],
  );

  const researchAgent = useGetResearchAgentById(characterId, {
    query: { enabled: isResearchAgent },
  });

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
      isResearchAgent && researchAgent.data?.data
        ? {
            isResearchAgent: true,
            researchSkills: researchAgent.data.data.skills.map(
              (skill) => skill.typeID,
            ),
          }
        : { isResearchAgent: false },

    [isResearchAgent, researchAgent.data?.data],
  );

  const agentInSpaceData:
    | (AgentInSpace & { isInSpace: true })
    | {
        isInSpace: false;
      } = useMemo(
    () =>
      isAgentInSpace && agentInSpace.data?.data
        ? {
            isInSpace: true,
            dungeonId: agentInSpace.data.data.dungeonID,
            solarSystemId: agentInSpace.data.data.solarSystemID,
            spawnPointId: agentInSpace.data.data.spawnPointID,
            typeId: agentInSpace.data.data.typeID,
          }
        : { isInSpace: false },
    [isAgentInSpace, agentInSpace.data?.data],
  );

  const mergedAgentData:
    | (AgentCharacter & { type: "agent"; isNpc: boolean })
    | null = useMemo(
    () =>
      isAgent && agent.data && esiCharacter.data
        ? {
            type: "agent",
            isNpc,
            agentTypeId: agent.data.data.agentTypeID,
            agentDivisionId: agent.data.data.divisionID,
            birthday: characterBirthdayDate,
            bloodlineId: esiCharacter.data.data.bloodline_id,
            corporationId: agent.data.data.corporationID,
            gender: esiCharacter.data.data.gender,
            isLocator: agent.data.data.isLocator,
            level: agent.data.data.level,
            locationId: agent.data.data.locationID,
            name: esiCharacter.data.data.name,
            raceId: esiCharacter.data.data.race_id,
            ...researchAgentData,
            ...agentInSpaceData,
          }
        : null,
    [agent.data?.data, researchAgentData, agentInSpaceData, isNpc],
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
          }
        : null,
    [esiCharacter.data, isNpc],
  );

  const error =
    esiCharacter.error ??
    agentIds.error ??
    agent.error ??
    agentInSpaceIds.error ??
    agentInSpace.error ??
    researchAgentIds.error ??
    researchAgent.error;

  const isError =
    esiCharacter.isError ||
    agentIds.isError ||
    agent.isError ||
    agentInSpaceIds.isError ||
    agentInSpace.isError ||
    researchAgentIds.isError ||
    researchAgent.isError;

  const isLoading =
    esiCharacter.isLoading ||
    agentIds.isLoading ||
    (isAgent && agent.isLoading) ||
    (isAgent && agentInSpaceIds.isLoading) ||
    (isAgentInSpace && agentInSpace.isLoading) ||
    (isAgent && researchAgentIds.isLoading) ||
    (isResearchAgent && researchAgent.isLoading) ||
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
