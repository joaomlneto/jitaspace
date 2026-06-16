import type {
  MRT_Cell,
  MRT_Column,
  MRT_ColumnDef,
  MRT_Row,
} from "mantine-react-table";
import { memo, useMemo } from "react";
import { Badge, Group } from "@mantine/core";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import type { CharacterWalletJournalEntry } from "@jitaspace/hooks";
import {
  EveEntityAnchor,
  EveEntityAvatar,
  EveEntityName,
} from "@jitaspace/eve-components";
import { DateHoverCard, FormattedDateText, ISKAmount } from "@jitaspace/ui";

function DateCell({
  cell,
}: Readonly<{ cell: MRT_Cell<CharacterWalletJournalEntry> }>) {
  return (
    <DateHoverCard date={cell.getValue<Date>()}>
      <FormattedDateText size="sm" date={cell.getValue<Date>()} />
    </DateHoverCard>
  );
}

function DateHeader({
  column,
}: Readonly<{ column: MRT_Column<CharacterWalletJournalEntry> }>) {
  return <em>{column.columnDef.header}</em>;
}

function ContextTypeCell({
  row,
}: Readonly<{ row: MRT_Row<CharacterWalletJournalEntry> }>) {
  return row.original.context_id_type ? (
    <Badge size="sm" variant="light">
      {row.original.context_id_type.replaceAll("_", " ")}
    </Badge>
  ) : undefined;
}

function FirstPartyCell({
  row,
}: Readonly<{ row: MRT_Row<CharacterWalletJournalEntry> }>) {
  return (
    <Group>
      <Group wrap="nowrap">
        <EveEntityAvatar entityId={row.original.first_party_id} size="sm" />
        <EveEntityAnchor
          size="sm"
          entityId={row.original.first_party_id}
          target="_blank"
        >
          <EveEntityName entityId={row.original.first_party_id} />
        </EveEntityAnchor>
      </Group>
    </Group>
  );
}

function SecondPartyCell({
  row,
}: Readonly<{ row: MRT_Row<CharacterWalletJournalEntry> }>) {
  return (
    <Group>
      <Group wrap="nowrap">
        <EveEntityAvatar entityId={row.original.second_party_id} size="sm" />
        <EveEntityAnchor
          size="sm"
          entityId={row.original.second_party_id}
          target="_blank"
        >
          <EveEntityName entityId={row.original.second_party_id} />
        </EveEntityAnchor>
      </Group>
    </Group>
  );
}

function OtherPartyCell({
  cell,
}: Readonly<{ cell: MRT_Cell<CharacterWalletJournalEntry> }>) {
  return (
    <Group>
      <Group wrap="nowrap">
        <EveEntityAvatar entityId={cell.getValue<number>()} size="sm" />
        <EveEntityAnchor
          size="sm"
          entityId={cell.getValue<number>()}
          target="_blank"
        >
          <EveEntityName entityId={cell.getValue<number>()} />
        </EveEntityAnchor>
      </Group>
    </Group>
  );
}

function AmountCell({
  row,
}: Readonly<{ row: MRT_Row<CharacterWalletJournalEntry> }>) {
  return row.original.amount === undefined ? undefined : (
    <ISKAmount
      size="sm"
      amount={Math.abs(row.original.amount)}
      c={row.original.amount >= 0 ? "green" : "red"}
    />
  );
}

function TaxReceiverCell({
  row,
}: Readonly<{ row: MRT_Row<CharacterWalletJournalEntry> }>) {
  return row.original.tax_receiver_id ? (
    <Group>
      <Group wrap="nowrap">
        <EveEntityAvatar entityId={row.original.tax_receiver_id} size="sm" />
        <EveEntityAnchor
          entityId={row.original.tax_receiver_id}
          target="_blank"
        >
          <EveEntityName entityId={row.original.tax_receiver_id} />
        </EveEntityAnchor>
      </Group>
    </Group>
  ) : undefined;
}

interface WalletTableProps {
  entries: CharacterWalletJournalEntry[];
}

export const WalletTable = memo(({ entries }: WalletTableProps) => {
  const columns = useMemo<MRT_ColumnDef<CharacterWalletJournalEntry>[]>(
    () => [
      {
        id: "id",
        header: "ID",
        accessorKey: "id",
        size: 40,
      },
      {
        id: "date",
        header: "Date",
        accessorFn: (row) => {
          // convert to Date for sorting and filtering
          return new Date(row.date);
        },
        filterVariant: "date-range",
        sortingFn: "datetime",
        size: 40,
        enableColumnFilterModes: false, //keep this as only date-range filter with between inclusive filterFn
        Cell: DateCell, //render Date as a string
        Header: DateHeader, //custom header markup
      },
      {
        id: "context_id",
        header: "Context ID",
        accessorKey: "context_id",
        size: 40,
      },
      {
        id: "context_id_type",
        header: "Context Type",
        accessorKey: "context_id_type",
        size: 40,
        Cell: ContextTypeCell,
      },
      {
        id: "firstParty",
        header: "First Party",
        accessorKey: "first_party_id",
        size: 40,
        Cell: FirstPartyCell,
      },
      {
        id: "secondParty",
        header: "Second Party",
        accessorKey: "second_party_id",
        size: 40,
        Cell: SecondPartyCell,
      },
      {
        id: "otherParty",
        header: "Other Party",
        accessorFn: (row) => {
          return (row.amount ?? 0) < 0
            ? row.second_party_id
            : row.first_party_id;
        },
        size: 40,
        Cell: OtherPartyCell,
      },
      {
        id: "amount",
        header: "Amount",
        accessorKey: "amount",
        size: 40,
        Cell: AmountCell,
      },
      {
        id: "balance",
        header: "Balance",
        accessorKey: "balance",
        size: 40,
        Cell: ({ renderedCellValue: _renderedCellValue, row, cell: _cell }) =>
          `${row.original.balance?.toLocaleString()} ISK`,
      },
      {
        id: "description",
        header: "Description",
        accessorKey: "description",
        size: 40,
      },
      {
        id: "reason",
        header: "Reason",
        accessorKey: "reason",
        size: 40,
      },
      {
        id: "tax",
        header: "Tax",
        accessorKey: "tax",
        size: 40,
      },
      {
        id: "taxReceiverId",
        header: "Tax Receiver",
        accessorKey: "tax_receiver_id",
        size: 40,
        Cell: TaxReceiverCell,
      },
    ],
    [],
  );

  const table = useMantineReactTable({
    columns,
    positionPagination: "top",
    enableFacetedValues: true,
    data: entries,
    initialState: {
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
});
WalletTable.displayName = "WalletTable";
