"use client";

import { useMemo } from "react";
import {
  Alert,
  Badge,
  Button,
  Center,
  Group,
  Pagination,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import type { ContractView } from "./ContractList";
import type { OpenContracts } from "./useOpenContracts";
import type { ContractFilters } from "~/components/Contracts/filters";
import { filterOpenContracts } from "~/components/Contracts/clientFilter";
import { PUBLIC_CONTRACTS_PAGE_SIZE } from "~/components/Contracts/filters";
import { OPEN_CONTRACT_SHARDS } from "~/components/Contracts/snapshot";
import { ContractList, ContractListSkeleton } from "./ContractList";

/**
 * The open public contracts the filters match, a page at a time. All of them
 * are in the browser (`useOpenContracts`), so filtering, sorting and paging
 * never wait on the server.
 */
export function PublicContracts({
  open,
  filters,
  view,
  onPageChange,
}: Readonly<{
  open: OpenContracts;
  filters: ContractFilters;
  view: ContractView;
  onPageChange: (page: number) => void;
}>) {
  const { type, regionId, q, minPrice, maxPrice, sort } = filters;
  const matching = useMemo(
    () =>
      filterOpenContracts(open.contracts, {
        type,
        regionId,
        q,
        minPrice,
        maxPrice,
        sort,
      }),
    [open.contracts, type, regionId, q, minPrice, maxPrice, sort],
  );

  const pageCount = Math.ceil(matching.length / PUBLIC_CONTRACTS_PAGE_SIZE);
  const page = matching.slice(
    (filters.page - 1) * PUBLIC_CONTRACTS_PAGE_SIZE,
    filters.page * PUBLIC_CONTRACTS_PAGE_SIZE,
  );
  const isLoaded = !open.isPending && !open.isError;

  let content;
  if (open.isError) {
    content = (
      <Alert color="red" variant="light">
        Public contracts could not be loaded. Try again in a moment.
      </Alert>
    );
  } else if (open.isPending) {
    content = (
      <Stack gap="xs">
        <Progress
          value={(open.loaded / OPEN_CONTRACT_SHARDS) * 100}
          size="xs"
          aria-label="Loading public contracts"
        />
        <ContractListSkeleton
          view={view}
          count={PUBLIC_CONTRACTS_PAGE_SIZE / 4}
        />
      </Stack>
    );
  } else if (page.length === 0 && matching.length > 0) {
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
  } else if (matching.length === 0) {
    content = (
      <Text size="sm" c="dimmed">
        No public contracts match these filters.
      </Text>
    );
  } else {
    content = <ContractList contracts={page} view={view} />;
  }

  return (
    <Stack gap="sm">
      <Group gap="xs" align="center">
        <Title order={2} size="h3">
          Public contracts
        </Title>
        {isLoaded && (
          <Badge variant="light" color="gray">
            {matching.length === open.contracts.length
              ? matching.length.toLocaleString()
              : `${matching.length.toLocaleString()} of ${open.contracts.length.toLocaleString()}`}
          </Badge>
        )}
      </Group>
      {content}
      {isLoaded && pageCount > 1 && (
        <Center mt="md">
          <Pagination
            total={pageCount}
            value={Math.min(filters.page, pageCount)}
            onChange={(next) => {
              onPageChange(next);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            siblings={1}
          />
        </Center>
      )}
    </Stack>
  );
}
