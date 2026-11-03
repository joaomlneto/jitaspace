"use client";

import { memo, useMemo } from "react";
import { Anchor, Group, Tooltip, VisuallyHidden } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import type { FreelanceJob } from "@jitaspace/hooks";
import { EveEntityAvatar, EveEntityName } from "@jitaspace/eve-components";
import { FormattedDateText } from "@jitaspace/ui";

import type { FreelanceJobSource } from "./freelanceJobs";
import { DataTable } from "~/components/DataTable";
import { HoverPrefetchLink } from "~/components/Link";
import {
  FreelanceJobProgress,
  FreelanceJobStateBadge,
  IskText,
} from "./FreelanceJobParts";
import {
  FREELANCE_JOB_STATES,
  freelanceJobProgressPercent,
  freelanceJobSourceKey,
} from "./freelanceJobs";

type Row = FreelanceJob & { sources?: FreelanceJobSource[] };

export interface FreelanceJobsTableProps {
  jobs: readonly Row[];
  /** Add a State column; the public board lists only active jobs. */
  showState?: boolean;
  /** Add a column naming which characters and corporations list each job. */
  showSources?: boolean;
  /** Where a job's name links to. Defaults to its public page. */
  jobHref?: (job: Row) => string;
  isLoading?: boolean;
  emptyText?: string;
}

const STATE_OPTIONS = FREELANCE_JOB_STATES.map((state) => ({
  value: state,
  label: state,
}));

export const freelanceJobHref = (job: Pick<FreelanceJob, "id">) =>
  `/freelance/${job.id}`;

function SourcesCell({ sources }: Readonly<{ sources: FreelanceJobSource[] }>) {
  return (
    <Group gap={4} wrap="nowrap">
      {/* The avatars' alt text is only an id, so they are hidden from screen
          readers, which read the names instead. */}
      {sources.map((source) => (
        <Tooltip
          key={freelanceJobSourceKey(source)}
          label={
            <EveEntityName
              span
              entityId={source.subjectId}
              category={source.kind}
            />
          }
          openDelay={300}
        >
          <span>
            <EveEntityAvatar
              entityId={source.subjectId}
              category={source.kind}
              size="sm"
              aria-hidden
            />
            <VisuallyHidden>
              <EveEntityName
                span
                entityId={source.subjectId}
                category={source.kind}
              />
            </VisuallyHidden>
          </span>
        </Tooltip>
      ))}
    </Group>
  );
}

const NO_JOBS: Row[] = [];

/**
 * A list of freelance jobs: the public board and "your jobs" both render
 * through this, so they sort, filter and page the same way.
 */
export const FreelanceJobsTable = memo(
  ({
    jobs,
    showState = false,
    showSources = false,
    jobHref = freelanceJobHref,
    isLoading = false,
    emptyText,
  }: FreelanceJobsTableProps) => {
    const columns = useMemo<DataTableColumn<Row>[]>(
      () => [
        {
          id: "name",
          header: "Job",
          accessor: "name",
          sortable: true,
          filter: { type: "text" },
          enableHiding: false,
          cell: (job) => (
            <Anchor component={HoverPrefetchLink} href={jobHref(job)} size="sm">
              {job.name || "Unnamed job"}
            </Anchor>
          ),
        },
        ...(showState
          ? [
              {
                id: "state",
                header: "State",
                accessor: "state",
                sortable: true,
                filter: { type: "multi-select", options: STATE_OPTIONS },
                cell: (job) => <FreelanceJobStateBadge state={job.state} />,
              } satisfies DataTableColumn<Row>,
            ]
          : []),
        {
          id: "progress",
          header: "Progress",
          accessor: (job) => freelanceJobProgressPercent(job),
          sortable: true,
          filter: { type: "range", min: 0, max: 100, step: 1 },
          cell: (job) => <FreelanceJobProgress job={job} />,
        },
        {
          id: "remaining",
          header: "Remaining reward",
          accessor: (job) => job.reward?.remaining,
          sortable: true,
          filter: { type: "range", min: 0 },
          align: "right",
          cell: (job) => <IskText amount={job.reward?.remaining} />,
        },
        {
          id: "initial",
          header: "Total reward",
          accessor: (job) => job.reward?.initial,
          sortable: true,
          filter: { type: "range", min: 0 },
          align: "right",
          defaultVisible: false,
          cell: (job) => <IskText amount={job.reward?.initial} />,
        },
        {
          id: "lastModified",
          header: "Last updated",
          accessor: "last_modified",
          sortable: true,
          filter: { type: "date-range" },
          cell: (job) => (
            <FormattedDateText
              size="sm"
              date={new Date(job.last_modified)}
              format="yyyy-MM-dd HH:mm"
            />
          ),
        },
        ...(showSources
          ? [
              {
                id: "sources",
                header: "Listed by",
                accessor: (job) => job.sources?.length ?? 0,
                sortable: true,
                cell: (job) => <SourcesCell sources={job.sources ?? []} />,
              } satisfies DataTableColumn<Row>,
            ]
          : []),
      ],
      [showState, showSources, jobHref],
    );

    return (
      <DataTable
        data={jobs.length === 0 ? NO_JOBS : (jobs as Row[])}
        columns={columns}
        rowId={(job) => job.id}
        isLoading={isLoading}
        emptyText={emptyText ?? "No freelance jobs"}
        withGlobalFilter
        withColumnVisibility
        withPagination
        defaultPageSize={25}
        initialSort={{ columnId: "remaining", direction: "desc" }}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />
    );
  },
);
FreelanceJobsTable.displayName = "FreelanceJobsTable";
