import { useMemo } from "react";

import { GetCharactersCharacterIdQueryResponseGender } from "@jitaspace/esi-client";
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

export type AgentCharacter = {
  agentTypeId: number;
  corporationId: number;
  agentDivisionId: number;
  isLocator: boolean;
  level: number;
  locationId: number;
} & PlayerCharacter;

export type Character =
  | ({
      type: "player";
    } & PlayerCharacter)
  | ({ type: "agent" } & AgentCharacter);

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
    (isResearchAgent && researchAgent.isLoading);

  const characterBirthdayDate = useMemo(
    () =>
      esiCharacter.data?.data.birthday
        ? new Date(esiCharacter.data.data.birthday)
        : null,
    [esiCharacter.data],
  );

  const mergedAgentData: (AgentCharacter & { type: "agent" }) | null = useMemo(
    () =>
      isAgent && agent.data && esiCharacter.data
        ? {
            type: "agent",
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
          }
        : null,
    [agent.data?.data],
  );

  const mergedPlayerData: (PlayerCharacter & { type: "player" }) | null =
    useMemo(
      () =>
        esiCharacter.data
          ? {
              type: "player",
              birthday: characterBirthdayDate,
              bloodlineId: esiCharacter.data.data.bloodline_id,
              corporationId: esiCharacter.data.data.corporation_id,
              gender: esiCharacter.data.data.gender,
              name: esiCharacter.data.data.name,
              raceId: esiCharacter.data.data.race_id,
            }
          : null,
      [esiCharacter.data],
    );

  return {
    error,
    isError,
    isLoading,
    data: mergedAgentData ?? mergedPlayerData ?? undefined,
  };
};
