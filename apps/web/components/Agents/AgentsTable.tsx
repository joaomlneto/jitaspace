import React, { useMemo } from "react";
import { Group, Text } from "@mantine/core";
import {
  MantineReactTable,
  MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";

import {
  CharacterAnchor,
  CharacterAvatar,
  CharacterName,
  CorporationAnchor,
  CorporationAvatar,
  CorporationName,
  FactionAnchor,
  FactionAvatar,
  FactionName,
  StationAnchor,
  StationName,
} from "@jitaspace/ui";

export type Agent = {
  characterId: number;
  name: string;
  corporationId: number;
  factionId?: number;
  agentTypeId: number;
  agentDivisionId: number;
  isLocator: boolean;
  level: number;
  stationId: number;
};

export type ContactsTableProps = {
  agents: Agent[];
  agentDivisions: { name: string; npcCorporationDivisionId: number }[];
  agentTypes: { name: string; agentTypeId: number }[];
};

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
        (index[division.npcCorporationDivisionId] = division.name ?? "Unknown"),
    );
    return index;
  }, [agentTypes]);

  const columns = useMemo<MRT_ColumnDef<Agent>[]>(
    () => [
      {
        id: "id",
        header: "Character ID",
        accessorKey: "characterId",
        size: 40,
      },
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        Cell: ({ renderedCellValue, row, cell }) => (
          <Group>
            <Group noWrap>
              <CharacterAvatar
                characterId={row.original.characterId}
                size="sm"
              />
              <CharacterAnchor
                characterId={row.original.characterId}
                target="_blank"
              >
                <CharacterName characterId={row.original.characterId} />
              </CharacterAnchor>
            </Group>
          </Group>
        ),
      },
      {
        id: "corporation",
        header: "Corporation",
        accessorKey: "corporationId",
        Cell: ({ renderedCellValue, row, cell }) => (
          <Group>
            <Group noWrap>
              <CorporationAvatar
                corporationId={row.original.corporationId}
                size="sm"
              />
              <CorporationAnchor
                corporationId={row.original.corporationId}
                target="_blank"
              >
                <CorporationName corporationId={row.original.corporationId} />
              </CorporationAnchor>
            </Group>
          </Group>
        ),
      },
      {
        id: "faction",
        header: "Faction",
        accessorKey: "factionId",
        Cell: ({ renderedCellValue, row, cell }) => (
          <Group>
            <Group noWrap>
              {row.original.factionId}
              <FactionAvatar factionId={row.original.factionId} size="sm" />
              <FactionAnchor factionId={row.original.factionId} target="_blank">
                <FactionName factionId={row.original.factionId} />
              </FactionAnchor>
            </Group>
          </Group>
        ),
      },
      {
        id: "type",
        header: "Type",
        accessorKey: "agentTypeId",
        Cell: ({ renderedCellValue, row, cell }) => (
          <Text>{agentTypeNames[row.original.agentTypeId]}</Text>
        ),
      },
      {
        id: "division",
        header: "Type",
        accessorKey: "agentDivisionId",
        Cell: ({ renderedCellValue, row, cell }) => (
          <Text>{divisionNames[row.original.agentDivisionId]}</Text>
        ),
      },
      {
        id: "isLocator",
        header: "Locator",
        accessorKey: "isLocator",
        size: 1,
        Cell: ({ renderedCellValue, row, cell }) => (
          <Text>{row.original.isLocator ? "Yes" : "No"}</Text>
        ),
      },
      {
        id: "level",
        header: "Level",
        accessorKey: "level",
        size: 1,
      },
      {
        id: "location",
        header: "Location",
        accessorKey: "stationId",
        Cell: ({ renderedCellValue, row, cell }) => (
          <StationAnchor target="_blank" stationId={row.original.stationId}>
            <StationName stationId={row.original.stationId} />
          </StationAnchor>
        ),
      },
    ],
    [],
  );

  const table = useMantineReactTable({
    columns,
    positionPagination: "top",
    enableFacetedValues: true,
    data: agents,
    initialState: {
      showColumnFilters: true,
      density: "xs",
      pagination: {
        pageIndex: 0,
        pageSize: 25,
      },
      columnVisibility: {
        id: false,
        tax: false,
        taxReceiverId: false,
        firstParty: false,
        secondParty: false,
        context_id: false,
      },
    },
  });

  return <MantineReactTable table={table} />;
};
