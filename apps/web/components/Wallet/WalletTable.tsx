import type {
  MRT_Cell,
  MRT_Column,
  MRT_ColumnDef,
  MRT_Row,
} from "mantine-react-table";
import { memo, useMemo } from "react";
import { Badge, Group, rem } from "@mantine/core";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import type { CharacterWalletJournalEntry } from "@jitaspace/hooks";
import {
  EveEntityAnchor,
  EveEntityAvatar,
  EveEntityName,
} from "@jitaspace/eve-components";
import { DateHoverCard, FormattedDateText, ISKAmount } from "@jitaspace/ui";

/**
 * A journal entry plus where it came from.
 *
 * Character and corporation journal entries have identical field sets (both are
 * `…WalletJournalGet`, 13 fields each), so one table renders both; only the
 * owner has to be carried alongside, because the entry itself never names it —
 * the owner is the query parameter, not part of the response.
 */
export interface WalletJournalRow extends CharacterWalletJournalEntry {
  /** Character id, or corporation id for a corporation wallet. */
  subjectId: number;
  /** Corporation wallet division. Absent for character wallets. */
  division?: number;
}

/**
 * A stable key for a row, unique across wallets.
 *
 * An ESI journal `id` is only unique *within* one wallet, so merging several
 * wallets can collide — hence the owner and division in the key.
 */
export const walletRowKey = (row: WalletJournalRow) =>
  `${row.subjectId}:${row.division ?? "c"}:${row.id}`;

function OwnerCell({ row }: Readonly<{ row: MRT_Row<WalletJournalRow> }>) {
  return (
    <Group wrap="nowrap" gap="xs">
      <EveEntityAvatar entityId={row.original.subjectId} size="sm" />
      <EveEntityAnchor
        size="sm"
        entityId={row.original.subjectId}
        target="_blank"
      >
        <EveEntityName entityId={row.original.subjectId} />
      </EveEntityAnchor>
      {row.original.division !== undefined && (
        <Badge size="xs" variant="light">
          Div {row.original.division}
        </Badge>
      )}
    </Group>
  );
}

function DateCell({ cell }: Readonly<{ cell: MRT_Cell<WalletJournalRow> }>) {
  return (
    <DateHoverCard date={cell.getValue<Date>()}>
      <FormattedDateText size="sm" date={cell.getValue<Date>()} />
    </DateHoverCard>
  );
}

function DateHeader({
  column,
}: Readonly<{ column: MRT_Column<WalletJournalRow> }>) {
  return <em>{column.columnDef.header}</em>;
}

function ContextTypeCell({
  row,
}: Readonly<{ row: MRT_Row<WalletJournalRow> }>) {
  return row.original.context_id_type ? (
    <Badge size="sm" variant="light">
      {row.original.context_id_type.replaceAll("_", " ")}
    </Badge>
  ) : undefined;
}

function FirstPartyCell({ row }: Readonly<{ row: MRT_Row<WalletJournalRow> }>) {
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
}: Readonly<{ row: MRT_Row<WalletJournalRow> }>) {
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
}: Readonly<{ cell: MRT_Cell<WalletJournalRow> }>) {
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

function AmountCell({ row }: Readonly<{ row: MRT_Row<WalletJournalRow> }>) {
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
}: Readonly<{ row: MRT_Row<WalletJournalRow> }>) {
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
  entries: WalletJournalRow[];
}

export const WalletTable = memo(({ entries }: WalletTableProps) => {
  // One wallet needs no owner column — it would repeat the same name on every
  // row. It earns its place only once entries come from more than one.
  const hasMultipleOwners = useMemo(
    () =>
      new Set(
        entries.map((entry) => `${entry.subjectId}:${entry.division ?? ""}`),
      ).size > 1,
    [entries],
  );

  const columns = useMemo<MRT_ColumnDef<WalletJournalRow>[]>(
    () => [
      ...(hasMultipleOwners
        ? [
            {
              id: "owner",
              header: "Owner",
              accessorKey: "subjectId",
              size: 40,
              Cell: OwnerCell,
            } satisfies MRT_ColumnDef<WalletJournalRow>,
          ]
        : []),
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
    [hasMultipleOwners],
  );

  const table = useMantineReactTable({
    columns,
    // Journal ids repeat across wallets, so the default row id (the index into
    // `data`) would be reused by React across re-sorts of a merged list.
    getRowId: walletRowKey,
    positionPagination: "top",
    enableFacetedValues: true,
    // Reserve vertical space so the table doesn't grow (and push the page down)
    // as the wallet journal loads in.
    mantineTableContainerProps: { style: { minHeight: rem(420) } },
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
