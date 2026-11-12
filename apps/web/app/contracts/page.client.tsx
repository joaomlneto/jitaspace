"use client";

import { useMemo } from "react";
import { Alert, Container, Group, Stack, Text, Title } from "@mantine/core";

import { ContractsIcon, SystemArrowRotateLeftIcon } from "@jitaspace/eve-icons";

import type { OpenContracts } from "./useOpenContracts";
import { regionFacets } from "~/components/Contracts/clientFilter";
import { useContractView } from "./ContractList";
import { FiltersBar } from "./FiltersBar";
import { MyContracts } from "./MyContracts";
import { PublicContracts } from "./PublicContracts";
import { useContractFilters } from "./useContractFilters";
import { useOpenContracts } from "./useOpenContracts";

function formatSnapshot(iso: string): string {
  return `${iso.slice(0, 16).replace("T", " ")} EVE time`;
}

/**
 * How current the public listing is. The snapshots are backfilled from
 * archives, oldest first, so for now "open" means open as of that snapshot.
 */
function SnapshotNotice({
  snapshotAt,
  isBackfilling,
}: Readonly<Pick<OpenContracts, "snapshotAt" | "isBackfilling">>) {
  if (snapshotAt === null) return null;
  if (!isBackfilling) {
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
      icon={<SystemArrowRotateLeftIcon size={18} color="currentColor" alt="" />}
      title={`Public contracts as of ${snapshotAt.slice(0, 10)}`}
    >
      We are still importing the history of public contracts, oldest first, and
      have reached {formatSnapshot(snapshotAt)}. The public list shows the
      contracts that were open then; it catches up as the import does. Your own
      contracts come straight from ESI and are current.
    </Alert>
  );
}

export default function ContractsPage() {
  const { filters, update, reset } = useContractFilters();
  const [view, setView] = useContractView();
  const open = useOpenContracts();

  const { type, q, minPrice, maxPrice } = filters;
  const regions = useMemo(
    () =>
      regionFacets(open.contracts, {
        type,
        regionId: null,
        q,
        minPrice,
        maxPrice,
      }),
    [open.contracts, type, q, minPrice, maxPrice],
  );
  const regionCount = useMemo(
    () => new Set(open.contracts.map(({ contract }) => contract.regionId)).size,
    [open.contracts],
  );

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Group>
            <ContractsIcon width={48} />
            <Title>Contracts</Title>
          </Group>
          <Text c="dimmed">
            {open.contracts.length > 0
              ? `${open.contracts.length.toLocaleString()} open public contracts across ${regionCount.toLocaleString()} regions, and your own.`
              : "Open public contracts across New Eden, and your own."}
          </Text>
        </Stack>
        <SnapshotNotice
          snapshotAt={open.snapshotAt}
          isBackfilling={open.isBackfilling}
        />
        <FiltersBar
          filters={filters}
          regions={regions}
          update={update}
          reset={reset}
          view={view}
          onViewChange={setView}
        />
        <MyContracts filters={filters} view={view} />
        <PublicContracts
          open={open}
          filters={filters}
          view={view}
          onPageChange={(page) => update({ page })}
        />
      </Stack>
    </Container>
  );
}
