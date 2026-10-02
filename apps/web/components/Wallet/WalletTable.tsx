import { memo, useMemo } from "react";
import { Badge, Group, Text, Tooltip } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import type { CharacterWalletJournalEntry } from "@jitaspace/hooks";
import {
  EveEntityAnchor,
  EveEntityAvatar,
  EveEntityName,
} from "@jitaspace/eve-components";
import { DateHoverCard, FormattedDateText, ISKAmount } from "@jitaspace/ui";

import { DataTable } from "~/components/DataTable";
import {
  getAccountingEntryType,
  getAccountingEntryTypeName,
} from "./accountingEntryTypes";

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

/** A party to an entry, as an avatar and linked name. */
function EntityCell({ entityId }: Readonly<{ entityId: number }>) {
  return (
    <Group wrap="nowrap" gap="xs">
      <EveEntityAvatar entityId={entityId} size="sm" />
      <EveEntityAnchor size="sm" entityId={entityId} target="_blank">
        <EveEntityName entityId={entityId} />
      </EveEntityAnchor>
    </Group>
  );
}

function ownerCell(row: WalletJournalRow) {
  return (
    <Group wrap="nowrap" gap="xs">
      <EntityCell entityId={row.subjectId} />
      {row.division !== undefined && (
        <Badge size="xs" variant="light">
          Div {row.division}
        </Badge>
      )}
    </Group>
  );
}

function refTypeCell(row: WalletJournalRow) {
  const name = getAccountingEntryTypeName(row.ref_type);
  const description = getAccountingEntryType(row.ref_type)?.description;

  if (!description) {
    return <Text size="sm">{name}</Text>;
  }

  return (
    <Tooltip
      label={description}
      multiline
      w={260}
      withArrow
      events={{ hover: true, focus: false, touch: true }}
    >
      {/* Dotted underline: the only hint that there is more to read here. */}
      <Text
        size="sm"
        span
        style={{ cursor: "help", textDecoration: "underline dotted" }}
      >
        {name}
      </Text>
    </Tooltip>
  );
}

function dateCell(_row: WalletJournalRow, value: unknown) {
  const date = value as Date;
  return (
    <DateHoverCard date={date}>
      <FormattedDateText size="sm" date={date} />
    </DateHoverCard>
  );
}

function contextTypeCell(row: WalletJournalRow) {
  return row.context_id_type ? (
    <Badge size="sm" variant="light">
      {row.context_id_type.replaceAll("_", " ")}
    </Badge>
  ) : undefined;
}

function partyCell(_row: WalletJournalRow, value: unknown) {
  return typeof value === "number" ? <EntityCell entityId={value} /> : null;
}

function amountCell(row: WalletJournalRow) {
  return row.amount === undefined ? undefined : (
    <ISKAmount
      size="sm"
      amount={Math.abs(row.amount)}
      c={row.amount >= 0 ? "green" : "red"}
    />
  );
}

interface WalletTableProps {
  entries: WalletJournalRow[];
  /**
   * Render a page of skeleton rows while the journal loads, so the table is
   * at its loaded height before the entries arrive.
   */
  isLoading?: boolean;
}

export const WalletTable = memo(
  ({ entries, isLoading = false }: WalletTableProps) => {
    // One wallet needs no owner column — it would repeat the same name on
    // every row. It earns its place only once entries come from more than one.
    const hasMultipleOwners = useMemo(
      () =>
        new Set(
          entries.map((entry) => `${entry.subjectId}:${entry.division ?? ""}`),
        ).size > 1,
      [entries],
    );

    const columns = useMemo<DataTableColumn<WalletJournalRow>[]>(
      () => [
        ...(hasMultipleOwners
          ? [
              {
                id: "owner",
                header: "Owner",
                accessor: "subjectId",
                sortable: true,
                cell: ownerCell,
              } satisfies DataTableColumn<WalletJournalRow>,
            ]
          : []),
        {
          id: "id",
          header: "ID",
          accessor: "id",
          sortable: true,
          defaultVisible: false,
        },
        {
          id: "date",
          header: "Date",
          // A Date, so the column sorts chronologically and the date-range
          // filter can compare days.
          accessor: (row) => new Date(row.date),
          sortable: true,
          filter: { type: "date-range" },
          cell: dateCell,
        },
        {
          id: "refType",
          header: "Type",
          // The entry type name EVE itself uses, so the column sorts, searches
          // and filters on what is actually displayed rather than on the raw
          // ESI ref_type.
          accessor: (row) => getAccountingEntryTypeName(row.ref_type),
          sortable: true,
          // An exact match on the name. Never a substring: "Brokers Fee" is
          // contained in both contract broker fees, and "Bounty" in six other
          // types, so picking one used to keep the others too.
          filter: { type: "multi-select" },
          cell: refTypeCell,
        },
        {
          id: "context_id",
          header: "Context ID",
          accessor: "context_id",
          sortable: true,
          defaultVisible: false,
        },
        {
          id: "context_id_type",
          header: "Context Type",
          accessor: "context_id_type",
          sortable: true,
          cell: contextTypeCell,
        },
        {
          id: "firstParty",
          header: "First Party",
          accessor: "first_party_id",
          sortable: true,
          defaultVisible: false,
          cell: partyCell,
        },
        {
          id: "secondParty",
          header: "Second Party",
          accessor: "second_party_id",
          sortable: true,
          defaultVisible: false,
          cell: partyCell,
        },
        {
          id: "otherParty",
          header: "Other Party",
          accessor: (row) =>
            (row.amount ?? 0) < 0 ? row.second_party_id : row.first_party_id,
          sortable: true,
          cell: partyCell,
        },
        {
          id: "amount",
          header: "Amount",
          accessor: "amount",
          sortable: true,
          filter: { type: "range" },
          align: "right",
          cell: amountCell,
        },
        {
          id: "balance",
          header: "Balance",
          accessor: "balance",
          sortable: true,
          align: "right",
          cell: (row) => `${row.balance?.toLocaleString()} ISK`,
        },
        {
          id: "description",
          header: "Description",
          accessor: "description",
          sortable: true,
        },
        {
          id: "reason",
          header: "Reason",
          accessor: "reason",
          sortable: true,
        },
        {
          id: "tax",
          header: "Tax",
          accessor: "tax",
          sortable: true,
          defaultVisible: false,
          align: "right",
        },
        {
          id: "taxReceiverId",
          header: "Tax Receiver",
          accessor: "tax_receiver_id",
          sortable: true,
          defaultVisible: false,
          cell: partyCell,
        },
      ],
      [hasMultipleOwners],
    );

    return (
      <DataTable
        data={entries}
        columns={columns}
        // Journal ids repeat across wallets, so the default row id (the index
        // into `data`) would be reused by React across re-sorts of a merged
        // list.
        rowId={walletRowKey}
        isLoading={isLoading}
        withGlobalFilter
        withColumnVisibility
        withPagination
        defaultPageSize={25}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />
    );
  },
);
WalletTable.displayName = "WalletTable";
