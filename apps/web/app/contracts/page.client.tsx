"use client";

import { useSyncExternalStore } from "react";
import { Alert, Container, Group, Stack, Text, Title } from "@mantine/core";
import { IconHistory } from "@tabler/icons-react";

import { ContractsIcon } from "@jitaspace/eve-icons";

import type { OpenContractsOverview } from "./data";
import { useContractView } from "./ContractList";
import { FiltersBar } from "./FiltersBar";
import { MyContracts } from "./MyContracts";
import { PublicContracts } from "./PublicContracts";
import { useContractFilters } from "./useContractFilters";

/** Older than this, the snapshot is called out as a backfill in progress. */
const STALE_SNAPSHOT_MS = 2 * 24 * 60 * 60 * 1000;

function formatSnapshot(iso: string): string {
  return `${iso.slice(0, 16).replace("T", " ")} EVE time`;
}

/**
 * The time the page was first shown in this browser; null on the server. The
 * snapshot's age needs the clock, which a prerendered page must not read, and
 * a render must not read it either (React's purity rule), so it is read once
 * and kept.
 */
let firstShownAt: number | null = null;
const subscribeNever = () => () => undefined;
const readFirstShownAt = () => (firstShownAt ??= Date.now());
const readNothing = () => null;

/**
 * How current the public listing is. The snapshots are backfilled from
 * archives, oldest first, so for now "open" means open as of that snapshot.
 */
function SnapshotNotice({
  snapshotAt,
}: Readonly<{ snapshotAt: string | null }>) {
  const now = useSyncExternalStore(
    subscribeNever,
    readFirstShownAt,
    readNothing,
  );
  if (snapshotAt === null) return null;
  const isStale =
    now !== null && now - Date.parse(snapshotAt) > STALE_SNAPSHOT_MS;

  if (!isStale) {
    return (
      <Text size="sm" c="dimmed">
        Public contracts as of {formatSnapshot(snapshotAt)}.
      </Text>
    );
  }
  return (
    <Alert
      variant="light"
      color="blue"
      icon={<IconHistory size={18} />}
      title={`Public contracts as of ${snapshotAt.slice(0, 10)}`}
    >
      We are still importing the history of public contracts, oldest first, and
      have reached {formatSnapshot(snapshotAt)}. The public list shows the
      contracts that were open then; it catches up as the import does. Your own
      contracts come straight from ESI and are current.
    </Alert>
  );
}

export default function ContractsPage({
  overview,
}: Readonly<{ overview: OpenContractsOverview }>) {
  const { filters, update, reset } = useContractFilters();
  const [view, setView] = useContractView();

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Group>
            <ContractsIcon width={48} />
            <Title>Contracts</Title>
          </Group>
          <Text c="dimmed">
            {overview.total.toLocaleString()} open public contracts across{" "}
            {overview.regions.length.toLocaleString()} regions, and your own.
          </Text>
        </Stack>
        <SnapshotNotice snapshotAt={overview.snapshotAt} />
        <FiltersBar
          filters={filters}
          regions={overview.regions}
          update={update}
          reset={reset}
          view={view}
          onViewChange={setView}
        />
        <MyContracts filters={filters} view={view} />
        <PublicContracts
          filters={filters}
          view={view}
          onPageChange={(page) => update({ page })}
        />
      </Stack>
    </Container>
  );
}
