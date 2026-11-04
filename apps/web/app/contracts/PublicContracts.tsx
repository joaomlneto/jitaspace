"use client";

import {
  Alert,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Pagination,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { ContractView } from "./ContractList";
import type { PublicContractsPage } from "./data";
import type { ContractFilters } from "~/components/Contracts/filters";
import {
  contractFiltersQuery,
  PUBLIC_CONTRACTS_PAGE_SIZE,
} from "~/components/Contracts/filters";
import { ContractList, ContractListSkeleton } from "./ContractList";

async function fetchPublicContracts(
  query: string,
  signal: AbortSignal,
): Promise<PublicContractsPage> {
  const response = await fetch(`/api/contracts${query ? `?${query}` : ""}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(`Contracts request failed with HTTP ${response.status}`);
  }
  return (await response.json()) as PublicContractsPage;
}

export function PublicContracts({
  filters,
  view,
  onPageChange,
}: Readonly<{
  filters: ContractFilters;
  view: ContractView;
  onPageChange: (page: number) => void;
}>) {
  const query = contractFiltersQuery(filters);
  const { data, isFetching, isError, isPlaceholderData } = useQuery({
    queryKey: ["public-contracts", query],
    queryFn: ({ signal }) => fetchPublicContracts(query, signal),
    // Keep the previous page on screen while the next loads, rather than
    // collapsing the grid to skeletons on every filter change.
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  const pageCount = data ? Math.ceil(data.total / data.pageSize) : 0;

  let content;
  if (data === undefined) {
    content = isError ? (
      <Alert color="red" variant="light">
        Public contracts could not be loaded. Try again in a moment.
      </Alert>
    ) : (
      <ContractListSkeleton
        view={view}
        count={PUBLIC_CONTRACTS_PAGE_SIZE / 4}
      />
    );
  } else if (data.contracts.length === 0 && data.total > 0) {
    // A shared or old link to a page past the end: contracts have closed
    // since, so the filters still match, just not this many pages.
    content = (
      <Group gap="sm">
        <Text size="sm" c="dimmed">
          Page {filters.page} is past the last page of these contracts.
        </Text>
        <Button size="xs" variant="default" onClick={() => onPageChange(1)}>
          Go to the first page
        </Button>
      </Group>
    );
  } else if (data.contracts.length === 0) {
    content = (
      <Text size="sm" c="dimmed">
        No public contracts match these filters.
      </Text>
    );
  } else {
    content = (
      <div style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
        <ContractList contracts={data.contracts} view={view} />
      </div>
    );
  }

  return (
    <Stack gap="sm">
      <Group gap="xs" align="center">
        <Title order={2} size="h3">
          Public contracts
        </Title>
        {data && (
          <Badge variant="light" color="gray">
            {data.total.toLocaleString()}
          </Badge>
        )}
        {isFetching && data && <Loader size="xs" />}
      </Group>
      {content}
      {pageCount > 1 && (
        <Center mt="md">
          <Pagination
            total={pageCount}
            value={Math.min(filters.page, pageCount)}
            onChange={(page) => {
              onPageChange(page);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            siblings={1}
          />
        </Center>
      )}
    </Stack>
  );
}
