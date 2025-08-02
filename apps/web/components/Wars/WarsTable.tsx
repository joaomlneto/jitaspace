import React, { useMemo } from "react";
import { Group } from "@mantine/core";
import {
  MantineReactTable,
  MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";

import {
  AllianceAnchor,
  AllianceAvatar,
  AllianceName,
  CorporationAnchor,
  CorporationAvatar,
  CorporationName,
  FormattedDateText,
  TimeAgoText,
  WarAnchor,
} from "@jitaspace/ui";

export type War = {
  warId: number;
  aggressorCorporationId?: number;
  aggressorAllianceId?: number;
  aggressorIskDestroyed: number;
  aggressorShipsKilled: number;
  allianceAllies: number[];
  corporationAllies: number[];
  declaredDate: Date;
  defenderCorporationId?: number;
  defenderAllianceId?: number;
  defenderIskDestroyed: number;
  defenderShipsKilled: number;
  startedDate?: Date;
  finishedDate?: Date;
  isMutual: boolean;
  isOpenForAllies: boolean;
  retractedDate?: Date;
  updatedAt: Date;
};

export type WarsTableProps = {
  wars: War[];
};

export const WarsTable = ({ wars }: WarsTableProps) => {
  const columns = useMemo<MRT_ColumnDef<War>[]>(
    () => [
      {
        id: "id",
        header: "War ID",
        accessorKey: "warId",
        Cell: ({ renderedCellValue, row, cell }) => (
          <WarAnchor inherit warId={row.original.warId} target="_blank">
            {row.original.warId}
          </WarAnchor>
        ),
      },
      {
        id: "aggressor",
        header: "Aggressor",
        //accessorKey: "aggressorCorporationId",
        Cell: ({ renderedCellValue, row, cell }) => (
          <Group>
            {row.original.aggressorCorporationId && (
              <Group wrap="nowrap">
                <CorporationAvatar
                  corporationId={row.original.aggressorCorporationId}
                  size="sm"
                />
                <CorporationAnchor
                  inherit
                  corporationId={row.original.aggressorCorporationId}
                  target="_blank"
                >
                  <CorporationName
                    inherit
                    corporationId={row.original.aggressorCorporationId}
                  />
                </CorporationAnchor>
              </Group>
            )}
            {row.original.aggressorAllianceId && (
              <Group wrap="nowrap">
                <AllianceAvatar
                  allianceId={row.original.aggressorAllianceId}
                  size="sm"
                />
                <AllianceAnchor
                  inherit
                  allianceId={row.original.aggressorAllianceId}
                  target="_blank"
                >
                  <AllianceName
                    inherit
                    allianceId={row.original.aggressorAllianceId}
                  />
                </AllianceAnchor>
              </Group>
            )}
          </Group>
        ),
      },
      {
        id: "aggressorIskDestroyed",
        header: "Aggressor ISK Destroyed",
        accessorKey: "aggressorIskDestroyed",
        size: 40,
        mantineTableHeadCellProps: {
          align: "right",
        },
        mantineTableBodyCellProps: {
          align: "right",
        },
        Cell: ({ renderedCellValue, row, cell }) =>
          `${row.original.aggressorIskDestroyed.toLocaleString()} ISK`,
      },
      {
        id: "aggressorShipsKilled",
        header: "Aggressor Ships Killed",
        accessorKey: "aggressorShipsKilled",
      },
      {
        id: "defender",
        header: "Defender",
        //accessorKey: "aggressorCorporationId",
        Cell: ({ renderedCellValue, row, cell }) => (
          <Group>
            {row.original.defenderCorporationId && (
              <Group wrap="nowrap">
                <CorporationAvatar
                  corporationId={row.original.defenderCorporationId}
                  size="sm"
                />
                <CorporationAnchor
                  inherit
                  corporationId={row.original.defenderCorporationId}
                  target="_blank"
                >
                  <CorporationName
                    inherit
                    corporationId={row.original.defenderCorporationId}
                  />
                </CorporationAnchor>
              </Group>
            )}
            {row.original.defenderAllianceId && (
              <Group wrap="nowrap">
                <AllianceAvatar
                  allianceId={row.original.defenderAllianceId}
                  size="sm"
                />
                <AllianceAnchor
                  inherit
                  allianceId={row.original.defenderAllianceId}
                  target="_blank"
                >
                  <AllianceName
                    inherit
                    allianceId={row.original.defenderAllianceId}
                  />
                </AllianceAnchor>
              </Group>
            )}
          </Group>
        ),
      },
      {
        id: "defenderIskDestroyed",
        header: "Defender ISK Destroyed",
        accessorKey: "defenderIskDestroyed",
        size: 40,
        mantineTableHeadCellProps: {
          align: "right",
        },
        mantineTableBodyCellProps: {
          align: "right",
        },
        Cell: ({ renderedCellValue, row, cell }) =>
          `${row.original.defenderIskDestroyed.toLocaleString()} ISK`,
      },
      {
        id: "defenderShipsKilled",
        header: "Defender Ships Killed",
        accessorKey: "defenderShipsKilled",
      },
      {
        id: "isOpenForAllies",
        header: "Open for Allies",
        accessorKey: "isOpenForAllies",
        Cell: ({ renderedCellValue, row, cell }) =>
          row.original.isOpenForAllies ? "Yes" : "No",
      },
      {
        id: "allies",
        header: "Allies",
        size: 40,
        Cell: ({ renderedCellValue, row, cell }) => (
          <Group>
            {row.original.allianceAllies.map((allyAllianceId) => (
              <AllianceAnchor
                key={allyAllianceId}
                inherit
                allianceId={allyAllianceId}
                target="_blank"
              >
                <AllianceAvatar allianceId={allyAllianceId} />
              </AllianceAnchor>
            ))}
            {row.original.corporationAllies.map((allyCorporationId) => (
              <CorporationAnchor
                key={allyCorporationId}
                inherit
                corporationId={allyCorporationId}
                target="_blank"
              >
                <CorporationAvatar corporationId={allyCorporationId} />
              </CorporationAnchor>
            ))}
          </Group>
        ),
      },
      // is mutual
      {
        id: "isMutual",
        header: "Mutual",
        accessorKey: "isMutual",
        Cell: ({ renderedCellValue, row, cell }) =>
          row.original.isMutual ? "Yes" : "No",
      },
      {
        id: "declaredDate",
        header: "Declared On",
        accessorKey: "declaredDate",
        Cell: ({ renderedCellValue, row, cell }) => (
          <FormattedDateText
            inherit
            date={new Date(row.original.declaredDate)}
          />
        ),
      },
      {
        id: "startedDate",
        header: "Started On",
        accessorKey: "startedDate",
        Cell: ({ renderedCellValue, row, cell }) =>
          row.original.startedDate && (
            <FormattedDateText
              inherit
              date={new Date(row.original.startedDate)}
            />
          ),
      },
      {
        id: "retractedDate",
        header: "Retracted On",
        accessorKey: "retractedDate",
        Cell: ({ renderedCellValue, row, cell }) =>
          row.original.retractedDate && (
            <FormattedDateText
              inherit
              date={new Date(row.original.retractedDate)}
            />
          ),
      },
      {
        id: "finishedDate",
        header: "Finished On",
        accessorKey: "finishedDate",
        Cell: ({ renderedCellValue, row, cell }) =>
          row.original.finishedDate && (
            <>
              <FormattedDateText
                inherit
                date={new Date(row.original.finishedDate)}
              />
            </>
          ),
      },
      {
        id: "updatedAt",
        header: "Last Updated",
        accessorKey: "updatedAt",
        Cell: ({ renderedCellValue, row, cell }) =>
          row.original.updatedAt && (
            <TimeAgoText
              inherit
              date={new Date(row.original.updatedAt)}
              addSuffix
            />
          ),
      },
    ],
    [],
  );

  const table = useMantineReactTable({
    columns,
    positionPagination: "top",
    enableFacetedValues: true,
    data: wars,
    initialState: {
      showColumnFilters: true,
      density: "xs",
      pagination: {
        pageIndex: 0,
        pageSize: 25,
      },
      columnVisibility: {
        //id: false,
      },
    },
  });

  return <MantineReactTable table={table} />;
};
