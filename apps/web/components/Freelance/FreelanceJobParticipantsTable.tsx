"use client";

import { memo, useMemo } from "react";
import { Group, Text } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import type { FreelanceJobParticipant } from "@jitaspace/hooks";
import { CharacterAvatar } from "@jitaspace/ui";

import { CharacterAnchor } from "~/components/Anchor";
import { DataTable } from "~/components/DataTable";
import {
  formatWhole,
  FreelanceParticipantStateBadge,
} from "./FreelanceJobParts";

const STATE_OPTIONS = ["Committed", "Kicked", "Resigned", "Unspecified"].map(
  (state) => ({ value: state, label: state }),
);

const NO_PARTICIPANTS: FreelanceJobParticipant[] = [];

/**
 * Everyone who joined a job, as its corporation's managers see them. `total`
 * is the job's current progress, which each contribution is a share of.
 */
export const FreelanceJobParticipantsTable = memo(
  ({
    participants,
    total,
    isLoading = false,
  }: Readonly<{
    participants?: FreelanceJobParticipant[];
    total: number;
    isLoading?: boolean;
  }>) => {
    const columns = useMemo<DataTableColumn<FreelanceJobParticipant>[]>(
      () => [
        {
          id: "name",
          header: "Participant",
          accessor: "name",
          sortable: true,
          filter: { type: "text" },
          enableHiding: false,
          cell: (participant) => (
            <Group gap="xs" wrap="nowrap">
              <CharacterAvatar characterId={participant.id} size="sm" />
              <CharacterAnchor characterId={participant.id} size="sm">
                {participant.name}
              </CharacterAnchor>
            </Group>
          ),
        },
        {
          id: "state",
          header: "State",
          accessor: "state",
          sortable: true,
          filter: { type: "multi-select", options: STATE_OPTIONS },
          cell: (participant) => (
            <FreelanceParticipantStateBadge state={participant.state} />
          ),
        },
        {
          id: "contributed",
          header: "Contributed",
          accessor: "contributed",
          sortable: true,
          filter: { type: "range", min: 0 },
          align: "right",
          cell: (participant) => (
            <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatWhole(participant.contributed)}
            </Text>
          ),
        },
        {
          id: "share",
          header: "Share",
          accessor: (participant) =>
            total > 0 ? (participant.contributed / total) * 100 : 0,
          sortable: true,
          align: "right",
          cell: (_participant, value) => (
            <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
              {(value as number).toFixed(1)}%
            </Text>
          ),
        },
      ],
      [total],
    );

    return (
      <DataTable
        data={participants ?? NO_PARTICIPANTS}
        columns={columns}
        rowId={(participant) => participant.id}
        isLoading={isLoading}
        emptyText="Nobody has joined this job yet"
        withGlobalFilter
        withPagination
        defaultPageSize={25}
        initialSort={{ columnId: "contributed", direction: "desc" }}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />
    );
  },
);
FreelanceJobParticipantsTable.displayName = "FreelanceJobParticipantsTable";
