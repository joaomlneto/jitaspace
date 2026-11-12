"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Center, Group, Stack, Text } from "@mantine/core";
import { useInfiniteQuery } from "@tanstack/react-query";

import type { ContractView } from "./ContractList";
import type {
  ContractHistoryPage,
  ContractHistorySubject,
} from "~/components/Contracts/history";
import { contractHistorySearch } from "~/components/Contracts/history";
import { Segmented } from "~/components/Wars/WarRoom/parts";
import {
  CONTRACT_VIEW_OPTIONS,
  ContractList,
  ContractListSkeleton,
  DEFAULT_CONTRACT_VIEW,
} from "./ContractList";

const DESCRIPTION: Record<ContractHistorySubject, string> = {
  character: "this character issued",
  corporation: "issued by this corporation's members or on its behalf",
  type: "that offered or asked for this item",
};

async function fetchPage(
  search: string,
  signal: AbortSignal,
): Promise<ContractHistoryPage> {
  const response = await fetch(`/api/contracts/history?${search}`, { signal });
  if (!response.ok) {
    throw new Error(
      `Contract history request failed with HTTP ${response.status}`,
    );
  }
  return (await response.json()) as ContractHistoryPage;
}

/**
 * The Contracts tab of a character, corporation or type page: every public
 * contract our snapshots recorded for it, open or ended, newest first.
 */
export function ContractHistoryTab({
  subject,
  id,
}: Readonly<{ subject: ContractHistorySubject; id: number }>) {
  const [view, setView] = useState<ContractView>(DEFAULT_CONTRACT_VIEW);
  const query = useInfiniteQuery({
    queryKey: ["contract-history", subject, id],
    queryFn: ({ pageParam, signal }) =>
      fetchPage(contractHistorySearch(subject, id, pageParam), signal),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.nextBefore,
    staleTime: 5 * 60 * 1000,
  });

  const contracts = useMemo(
    () => query.data?.pages.flatMap((page) => page.contracts) ?? [],
    [query.data],
  );

  let content;
  if (query.data === undefined) {
    content = query.isError ? (
      <Alert color="red" variant="light">
        <Group justify="space-between" gap="sm">
          <Text size="sm">Contracts could not be loaded.</Text>
          <Button
            size="xs"
            variant="default"
            loading={query.isRefetching}
            onClick={() => void query.refetch()}
          >
            Try again
          </Button>
        </Group>
      </Alert>
    ) : (
      <ContractListSkeleton view={view} count={8} />
    );
  } else if (contracts.length === 0) {
    content = (
      <Text size="sm" c="dimmed">
        No public contracts recorded.
      </Text>
    );
  } else {
    content = (
      <>
        <ContractList contracts={contracts} view={view} />
        {query.isFetchNextPageError && (
          <Alert color="red" variant="light">
            Older contracts could not be loaded. Try again in a moment.
          </Alert>
        )}
        {query.hasNextPage && (
          <Center>
            <Button
              variant="default"
              size="xs"
              loading={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              Show older contracts
            </Button>
          </Center>
        )}
      </>
    );
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between" gap="sm" wrap="wrap">
        <Text size="sm" c="dimmed" maw={640}>
          Public contracts {DESCRIPTION[subject]}, newest first, as our
          snapshots of the public listing recorded them. Private contracts are
          not listed.
        </Text>
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          data={CONTRACT_VIEW_OPTIONS}
        />
      </Group>
      {content}
    </Stack>
  );
}
