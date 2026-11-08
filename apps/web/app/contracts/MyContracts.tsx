"use client";

import { useMemo } from "react";
import { Alert, Badge, Group, Paper, Stack, Text, Title } from "@mantine/core";

import type { ESIScope } from "@jitaspace/esi-metadata";
import type { AuthenticatedContract } from "@jitaspace/hooks";
import {
  useAuthenticatedContracts,
  useAuthStoreHasHydrated,
  useSelectedCharacter,
} from "@jitaspace/hooks";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import type { ContractView } from "./ContractList";
import type { ContractSummary } from "~/components/Contracts/contract";
import type { ContractFilters } from "~/components/Contracts/filters";
import {
  contractHeadlineIsk,
  fromEsiContract,
} from "~/components/Contracts/contract";
import { loginWithEveOnline } from "~/lib/eveOnlineLogin";
import { ContractList, ContractListSkeleton } from "./ContractList";

export const CONTRACT_SCOPES: ESIScope[] = [
  "esi-contracts.read_character_contracts.v1",
  "esi-contracts.read_corporation_contracts.v1",
];

/**
 * Open contracts the authenticated characters issued, personally or for their
 * corporations. ESI's listings also hold contracts assigned to or accepted by
 * them, and finished ones from the last 30 days; this section is about what
 * they have on offer.
 */
function isOwnOpenContract(
  contract: AuthenticatedContract,
  characterIds: Set<number>,
  corporationIds: Set<number>,
): boolean {
  if (contract.status !== "outstanding") return false;
  if (characterIds.has(contract.issuer_id)) return true;
  return (
    contract.for_corporation &&
    corporationIds.has(contract.issuer_corporation_id)
  );
}

/** The page's filters, applied in the browser to what ESI returned. */
function matchesFilters(
  contract: ContractSummary,
  filters: ContractFilters,
): boolean {
  if (filters.type !== "all" && contract.type !== filters.type) return false;
  if (
    filters.q &&
    !contract.title.toLowerCase().includes(filters.q.toLowerCase())
  ) {
    return false;
  }
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    // The amount the row shows, as the public list filters on: a "want to
    // buy" exchange is listed at its reward, its price being 0.
    const { amount } = contractHeadlineIsk(contract);
    if (amount === null) return false;
    if (filters.minPrice !== null && amount < filters.minPrice) return false;
    if (filters.maxPrice !== null && amount > filters.maxPrice) return false;
  }
  return true;
}

function compare(
  a: ContractSummary,
  b: ContractSummary,
  sort: ContractFilters["sort"],
): number {
  switch (sort) {
    case "oldest":
      return a.dateIssued.localeCompare(b.dateIssued);
    case "expiring":
      return a.dateExpired.localeCompare(b.dateExpired);
    case "price-desc":
      return (
        (contractHeadlineIsk(b).amount ?? -1) -
        (contractHeadlineIsk(a).amount ?? -1)
      );
    case "price-asc":
      return (
        (contractHeadlineIsk(a).amount ?? Infinity) -
        (contractHeadlineIsk(b).amount ?? Infinity)
      );
    case "newest":
      return b.dateIssued.localeCompare(a.dateIssued);
  }
}

function SignInPrompt({ hasCharacter }: Readonly<{ hasCharacter: boolean }>) {
  const selected = useSelectedCharacter();
  const granted = selected?.accessTokenPayload.scp ?? [];
  return (
    <Paper withBorder radius="md" p="md">
      <Group justify="space-between" gap="md">
        <Text size="sm" c="dimmed" maw={560}>
          {hasCharacter
            ? "Grant JitaSpace access to your contracts to see the ones you and your corporations have on offer here."
            : "Sign in with EVE Online to see the contracts you and your corporations have on offer, next to the public ones."}
        </Text>
        <LoginWithEveOnlineButton
          size="small"
          onClick={() =>
            loginWithEveOnline([...new Set([...granted, ...CONTRACT_SCOPES])])
          }
        />
      </Group>
    </Paper>
  );
}

export function MyContracts({
  filters,
  view,
}: Readonly<{ filters: ContractFilters; view: ContractView }>) {
  const hasHydrated = useAuthStoreHasHydrated();
  const selected = useSelectedCharacter();
  const { data, isPending, errors, characterIds, corporationIds } =
    useAuthenticatedContracts();

  const own = useMemo(() => {
    const characters = new Set(characterIds);
    const corporations = new Set(corporationIds);
    return data
      .filter((contract) =>
        isOwnOpenContract(contract, characters, corporations),
      )
      .map(fromEsiContract);
  }, [data, characterIds, corporationIds]);

  const shown = useMemo(
    () =>
      own
        .filter((contract) => matchesFilters(contract, filters))
        .sort((a, b) => compare(a, b, filters.sort)),
    [own, filters],
  );

  // Nothing to say before the persisted login has loaded.
  if (!hasHydrated) return null;

  const canRead = characterIds.length > 0 || corporationIds.length > 0;
  const publicOnly = filters.regionId !== null;

  return (
    <Stack gap="sm">
      <Group gap="xs" align="baseline">
        <Title order={2} size="h3">
          Your contracts
        </Title>
        {canRead && !isPending && (
          <Badge variant="light" color="gray">
            {shown.length === own.length
              ? own.length
              : `${shown.length} of ${own.length}`}
          </Badge>
        )}
      </Group>
      {!canRead && <SignInPrompt hasCharacter={selected !== null} />}
      {canRead && errors.length > 0 && (
        <Alert color="yellow" variant="light">
          ESI did not return the contracts of {errors.length} of your characters
          or corporations; the rest are shown.
        </Alert>
      )}
      {canRead && publicOnly && (
        <Text size="xs" c="dimmed">
          The region filter applies to public contracts only: ESI does not list
          your contracts&apos; regions.
        </Text>
      )}
      {canRead && isPending && <ContractListSkeleton view={view} count={3} />}
      {canRead && !isPending && shown.length === 0 && (
        <Text size="sm" c="dimmed">
          {own.length === 0
            ? "None of your characters or corporations has an open contract."
            : "None of your open contracts match these filters."}
        </Text>
      )}
      {canRead && !isPending && shown.length > 0 && (
        <ContractList contracts={shown} view={view} />
      )}
    </Stack>
  );
}
