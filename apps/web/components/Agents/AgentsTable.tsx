"use client";

import { useMemo } from "react";
import { Group } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import {
  CharacterAnchor,
  CharacterName,
  CorporationName,
  StationAnchor,
  StationName,
} from "@jitaspace/eve-components";
import {
  CharacterAvatar,
  CorporationAnchor,
  CorporationAvatar,
} from "@jitaspace/ui";

import { StationAvatar } from "~/components/Avatar";
import { DataTable } from "~/components/DataTable";

export interface Agent {
  characterId: number;
  name: string;
  corporationId: number;
  agentTypeId: number;
  agentDivisionId: number;
  isLocator: boolean;
  level: number;
  stationId: number;
}

export interface ContactsTableProps {
  agents: Agent[];
  agentDivisions: { name: string; npcCorporationDivisionId: number }[];
  agentTypes: { name: string; agentTypeId: number }[];
}

function nameCell(agent: Agent) {
  return (
    <Group wrap="nowrap">
      <CharacterAvatar characterId={agent.characterId} size="sm" />
      <CharacterAnchor inherit characterId={agent.characterId} target="_blank">
        <CharacterName inherit characterId={agent.characterId} />
      </CharacterAnchor>
    </Group>
  );
}

function corporationCell(agent: Agent) {
  return (
    <Group wrap="nowrap">
      <CorporationAvatar corporationId={agent.corporationId} size="sm" />
      <CorporationAnchor
        inherit
        corporationId={agent.corporationId}
        target="_blank"
      >
        <CorporationName inherit corporationId={agent.corporationId} />
      </CorporationAnchor>
    </Group>
  );
}

function locationCell(agent: Agent) {
  return (
    <Group wrap="nowrap" gap="xs">
      <StationAvatar stationId={agent.stationId} size="xs" />
      <StationAnchor inherit target="_blank" stationId={agent.stationId}>
        <StationName inherit stationId={agent.stationId} />
      </StationAnchor>
    </Group>
  );
}

export const AgentsTable = ({
  agents,
  agentDivisions,
  agentTypes,
}: ContactsTableProps) => {
  const agentTypeNames = useMemo(() => {
    const index: Record<string, string> = {};
    agentTypes.forEach((type) => (index[type.agentTypeId] = type.name));
    return index;
  }, [agentTypes]);
  const divisionNames = useMemo(() => {
    const index: Record<string, string> = {};
    agentDivisions.forEach(
      (division) =>
        (index[division.npcCorporationDivisionId] =
          typeof division.name === "string" ? division.name : "Unknown"),
    );
    return index;
  }, [agentDivisions]);

  const columns = useMemo<DataTableColumn<Agent>[]>(
    () => [
      {
        id: "id",
        header: "Character ID",
        accessor: "characterId",
        sortable: true,
        defaultVisible: false,
      },
      {
        id: "name",
        header: "Name",
        accessor: "name",
        sortable: true,
        cell: nameCell,
      },
      {
        id: "corporation",
        header: "Corporation",
        accessor: "corporationId",
        sortable: true,
        cell: corporationCell,
      },
      {
        id: "type",
        header: "Type",
        accessor: (agent) => agentTypeNames[agent.agentTypeId],
        sortable: true,
        filter: { type: "select" },
      },
      {
        id: "division",
        header: "Division",
        accessor: (agent) => divisionNames[agent.agentDivisionId],
        sortable: true,
        filter: { type: "select" },
      },
      {
        id: "isLocator",
        header: "Locator",
        accessor: "isLocator",
        sortable: true,
        filter: { type: "boolean" },
        cell: (agent) => (agent.isLocator ? "Yes" : "No"),
      },
      {
        id: "level",
        header: "Level",
        accessor: "level",
        sortable: true,
        filter: { type: "multi-select" },
      },
      {
        id: "location",
        header: "Location",
        accessor: "stationId",
        sortable: true,
        cell: locationCell,
      },
    ],
    [agentTypeNames, divisionNames],
  );

  return (
    <DataTable
      data={agents}
      columns={columns}
      rowId={(agent) => agent.characterId}
      withGlobalFilter
      withColumnVisibility
      withPagination
      defaultPageSize={25}
      verticalSpacing="xs"
      highlightOnHover
      striped
    />
  );
};
