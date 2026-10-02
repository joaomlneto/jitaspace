"use client";

import { Group } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { AllianceName, CorporationName } from "@jitaspace/eve-components";
import {
  AllianceAnchor,
  AllianceAvatar,
  CorporationAnchor,
  CorporationAvatar,
  DateHoverCard,
  FormattedDateText,
  TimeAgoText,
  WarAnchor,
} from "@jitaspace/ui";

import { DataTable } from "~/components/DataTable";

export interface War {
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
}

export interface WarsTableProps {
  wars: War[];
}

function warIdCell(war: War) {
  return (
    <WarAnchor inherit warId={war.warId} target="_blank">
      {war.warId}
    </WarAnchor>
  );
}

function aggressorCell(war: War) {
  return (
    <Group>
      {war.aggressorCorporationId && (
        <Group wrap="nowrap">
          <CorporationAvatar
            corporationId={war.aggressorCorporationId}
            size="sm"
          />
          <CorporationAnchor
            inherit
            corporationId={war.aggressorCorporationId}
            target="_blank"
          >
            <CorporationName
              inherit
              corporationId={war.aggressorCorporationId}
            />
          </CorporationAnchor>
        </Group>
      )}
      {war.aggressorAllianceId && (
        <Group wrap="nowrap">
          <AllianceAvatar allianceId={war.aggressorAllianceId} size="sm" />
          <AllianceAnchor
            inherit
            allianceId={war.aggressorAllianceId}
            target="_blank"
          >
            <AllianceName inherit allianceId={war.aggressorAllianceId} />
          </AllianceAnchor>
        </Group>
      )}
    </Group>
  );
}

function defenderCell(war: War) {
  return (
    <Group>
      {war.defenderCorporationId && (
        <Group wrap="nowrap">
          <CorporationAvatar
            corporationId={war.defenderCorporationId}
            size="sm"
          />
          <CorporationAnchor
            inherit
            corporationId={war.defenderCorporationId}
            target="_blank"
          >
            <CorporationName
              inherit
              corporationId={war.defenderCorporationId}
            />
          </CorporationAnchor>
        </Group>
      )}
      {war.defenderAllianceId && (
        <Group wrap="nowrap">
          <AllianceAvatar allianceId={war.defenderAllianceId} size="sm" />
          <AllianceAnchor
            inherit
            allianceId={war.defenderAllianceId}
            target="_blank"
          >
            <AllianceName inherit allianceId={war.defenderAllianceId} />
          </AllianceAnchor>
        </Group>
      )}
    </Group>
  );
}

function alliesCell(war: War) {
  return (
    <Group>
      {war.allianceAllies.map((allyAllianceId) => (
        <AllianceAnchor
          key={allyAllianceId}
          inherit
          allianceId={allyAllianceId}
          target="_blank"
        >
          <AllianceAvatar allianceId={allyAllianceId} />
        </AllianceAnchor>
      ))}
      {war.corporationAllies.map((allyCorporationId) => (
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
  );
}

function declaredDateCell(war: War) {
  return (
    <DateHoverCard date={new Date(war.declaredDate)}>
      <FormattedDateText inherit date={new Date(war.declaredDate)} />
    </DateHoverCard>
  );
}

function startedDateCell(war: War) {
  return (
    war.startedDate && (
      <DateHoverCard date={new Date(war.startedDate)}>
        <FormattedDateText inherit date={new Date(war.startedDate)} />
      </DateHoverCard>
    )
  );
}

function retractedDateCell(war: War) {
  return (
    war.retractedDate && (
      <DateHoverCard date={new Date(war.retractedDate)}>
        <FormattedDateText inherit date={new Date(war.retractedDate)} />
      </DateHoverCard>
    )
  );
}

function finishedDateCell(war: War) {
  return (
    war.finishedDate && (
      <DateHoverCard date={new Date(war.finishedDate)}>
        <FormattedDateText inherit date={new Date(war.finishedDate)} />
      </DateHoverCard>
    )
  );
}

function updatedAtCell(war: War) {
  return (
    <DateHoverCard date={new Date(war.updatedAt)}>
      <TimeAgoText inherit date={new Date(war.updatedAt)} addSuffix />
    </DateHoverCard>
  );
}

const columns: DataTableColumn<War>[] = [
  {
    id: "id",
    header: "War ID",
    accessor: "warId",
    sortable: true,
    cell: warIdCell,
  },
  {
    id: "aggressor",
    header: "Aggressor",
    cell: aggressorCell,
  },
  {
    id: "aggressorIskDestroyed",
    header: "Aggressor ISK Destroyed",
    accessor: "aggressorIskDestroyed",
    sortable: true,
    align: "right",
    cell: (war) => `${war.aggressorIskDestroyed.toLocaleString()} ISK`,
  },
  {
    id: "aggressorShipsKilled",
    header: "Aggressor Ships Killed",
    accessor: "aggressorShipsKilled",
    sortable: true,
    align: "right",
  },
  {
    id: "defender",
    header: "Defender",
    cell: defenderCell,
  },
  {
    id: "defenderIskDestroyed",
    header: "Defender ISK Destroyed",
    accessor: "defenderIskDestroyed",
    sortable: true,
    align: "right",
    cell: (war) => `${war.defenderIskDestroyed.toLocaleString()} ISK`,
  },
  {
    id: "defenderShipsKilled",
    header: "Defender Ships Killed",
    accessor: "defenderShipsKilled",
    sortable: true,
    align: "right",
  },
  {
    id: "isOpenForAllies",
    header: "Open for Allies",
    accessor: "isOpenForAllies",
    sortable: true,
    filter: { type: "boolean" },
    cell: (war) => (war.isOpenForAllies ? "Yes" : "No"),
  },
  {
    id: "allies",
    header: "Allies",
    cell: alliesCell,
  },
  {
    id: "isMutual",
    header: "Mutual",
    accessor: "isMutual",
    sortable: true,
    filter: { type: "boolean" },
    cell: (war) => (war.isMutual ? "Yes" : "No"),
  },
  {
    id: "declaredDate",
    header: "Declared On",
    accessor: "declaredDate",
    sortable: true,
    filter: { type: "date-range" },
    cell: declaredDateCell,
  },
  {
    id: "startedDate",
    header: "Started On",
    accessor: "startedDate",
    sortable: true,
    filter: { type: "date-range" },
    cell: startedDateCell,
  },
  {
    id: "retractedDate",
    header: "Retracted On",
    accessor: "retractedDate",
    sortable: true,
    cell: retractedDateCell,
  },
  {
    id: "finishedDate",
    header: "Finished On",
    accessor: "finishedDate",
    sortable: true,
    cell: finishedDateCell,
  },
  {
    id: "updatedAt",
    header: "Last Updated",
    accessor: "updatedAt",
    sortable: true,
    cell: updatedAtCell,
  },
];

export const WarsTable = ({ wars }: WarsTableProps) => (
  <DataTable
    data={wars}
    columns={columns}
    rowId={(war) => war.warId}
    withGlobalFilter
    withColumnVisibility
    withPagination
    defaultPageSize={25}
    verticalSpacing="xs"
    highlightOnHover
    striped
  />
);
