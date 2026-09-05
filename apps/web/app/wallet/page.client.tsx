"use client";

import { useMemo } from "react";
import {
  Alert,
  Chip,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";

import { EveEntityAvatar, EveEntityName } from "@jitaspace/eve-components";
import { WalletIcon } from "@jitaspace/eve-icons";
import {
  useMultipleCharacterWalletJournal,
  useMultipleCorporationWalletJournal,
} from "@jitaspace/hooks";

import type { WalletJournalRow } from "~/components/Wallet";
import { WalletTable } from "~/components/Wallet";

/**
 * A wallet the signed-in characters can read.
 *
 * Keyed `character:<id>` / `corporation:<id>` rather than by bare id, because a
 * character and a corporation could in principle share a numeric id space and
 * the selection lives in the URL where it has to round-trip unambiguously.
 */
interface WalletOwner {
  key: string;
  subjectId: number;
  kind: "character" | "corporation";
}

const ownerKey = (kind: WalletOwner["kind"], subjectId: number) =>
  `${kind}:${subjectId}`;

export default function WalletPageClient() {
  const characters = useMultipleCharacterWalletJournal();
  const corporations = useMultipleCorporationWalletJournal();

  // The subject ids come from the hooks themselves: each one has already
  // filtered to the characters that granted the scope, and — for corporations —
  // that hold the Accountant role. So this lists exactly the wallets that can
  // actually be read, with no separate permission check to drift out of step.
  const owners = useMemo<WalletOwner[]>(
    () => [
      ...characters.subjectIds.map((subjectId) => ({
        key: ownerKey("character", subjectId),
        subjectId,
        kind: "character" as const,
      })),
      ...corporations.subjectIds.map((subjectId) => ({
        key: ownerKey("corporation", subjectId),
        subjectId,
        kind: "corporation" as const,
      })),
    ],
    [characters.subjectIds, corporations.subjectIds],
  );

  // `null` (no param) means "everything", so a bare /wallet shows all wallets
  // without having to enumerate them into the URL first. An explicit empty
  // array is a real choice — the user deselected everything — and stays empty.
  const [selectedKeys, setSelectedKeys] = useQueryState(
    "owners",
    parseAsArrayOf(parseAsString),
  );

  const activeKeys = useMemo(
    () => new Set(selectedKeys ?? owners.map((owner) => owner.key)),
    [selectedKeys, owners],
  );

  const entries = useMemo<WalletJournalRow[]>(() => {
    const rows: WalletJournalRow[] = [
      ...characters.data
        .filter((entry) =>
          activeKeys.has(ownerKey("character", entry.subjectId)),
        )
        .map((entry) => ({ ...entry, division: undefined })),
      ...corporations.data.filter((entry) =>
        activeKeys.has(ownerKey("corporation", entry.subjectId)),
      ),
    ];
    // One list across every wallet, newest first — the reason to merge at all.
    return rows.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [characters.data, corporations.data, activeKeys]);

  const isPending = characters.isPending || corporations.isPending;
  const errors = [...characters.errors, ...corporations.errors];

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <WalletIcon width={48} />
          <Title>Wallet</Title>
        </Group>

        {owners.length === 0 && !isPending && (
          <Alert color="yellow" title="No wallets available">
            None of your characters have granted wallet access. Sign in again
            and approve the wallet permission to see entries here. Corporation
            wallets additionally need the Accountant or Junior Accountant role
            in-game.
          </Alert>
        )}

        {owners.length > 1 && (
          <Chip.Group
            multiple
            value={[...activeKeys]}
            onChange={(value) => {
              // Drop the param entirely when everything is selected, so the
              // default state leaves a clean URL rather than listing every
              // wallet the user owns.
              void setSelectedKeys(
                value.length === owners.length ? null : value,
              );
            }}
          >
            <Group gap="xs">
              {owners.map((owner) => (
                <Chip key={owner.key} value={owner.key} size="sm">
                  <Group gap={6} wrap="nowrap" component="span">
                    <EveEntityAvatar entityId={owner.subjectId} size={16} />
                    <EveEntityName entityId={owner.subjectId} />
                  </Group>
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        )}

        {errors.length > 0 && (
          <Alert color="orange" title="Some wallets could not be loaded">
            <Stack gap={2}>
              {errors.map((error) => (
                <Text key={error.subjectId} size="sm">
                  <EveEntityName entityId={error.subjectId} />
                  {": "}
                  {error.error.message}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        <WalletTable entries={entries} />
      </Stack>
    </Container>
  );
}
