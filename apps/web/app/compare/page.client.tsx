"use client";

import { useCallback, useMemo } from "react";
import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { IconCheck, IconLink } from "@tabler/icons-react";
import { parseAsArrayOf, parseAsInteger, useQueryState } from "nuqs";
import posthog from "posthog-js";

import { CompareToolIcon } from "@jitaspace/eve-icons";

import type { CompareItemsAddedEvent } from "~/components/Compare";
import {
  CompareEmptyState,
  ItemComparison,
  normalizeTypeIds,
} from "~/components/Compare";

export default function PageClient() {
  // A comparison is inherently something you want to send to someone, so the
  // selected types live in the URL, in column order: the first is the
  // baseline. The integer item-parser also validates: nuqs drops anything it
  // can't parse, so a hand-edited `?types=abc` can't reach the type lookups
  // as NaN.
  const [rawTypeIds, setTypeIds] = useQueryState(
    "types",
    parseAsArrayOf(parseAsInteger)
      .withDefault([])
      .withOptions({ history: "replace" }),
  );
  const typeIds = useMemo(() => normalizeTypeIds(rawTypeIds), [rawTypeIds]);
  const clipboard = useClipboard({ timeout: 2000 });

  const setTypes = useCallback(
    (next: number[]) => void setTypeIds(next.length > 0 ? next : null),
    [setTypeIds],
  );

  const captureAdded = useCallback(
    ({ typeIds: next, source }: CompareItemsAddedEvent) =>
      posthog.capture("compare_items_added", {
        type_ids: next,
        item_count: next.length,
        source,
      }),
    [],
  );

  return (
    <Container size="xl">
      <Stack gap="md">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Group gap="md" wrap="nowrap">
            <CompareToolIcon width={48} />
            <div>
              <Title>Compare Tool</Title>
              <Text c="dimmed" size="sm">
                Ships, modules and other items side by side: fitting, tank,
                speed, every attribute, and Jita prices.
              </Text>
            </div>
          </Group>
          {typeIds.length > 0 && (
            <Button
              variant="light"
              size="xs"
              leftSection={
                clipboard.copied ? (
                  <IconCheck size={14} />
                ) : (
                  <IconLink size={14} />
                )
              }
              onClick={() => clipboard.copy(window.location.href)}
            >
              {clipboard.copied ? "Link copied" : "Copy link"}
            </Button>
          )}
        </Group>

        <ItemComparison
          typeIds={typeIds}
          onTypeIdsChange={setTypes}
          onItemsAdded={captureAdded}
          emptyState={
            <CompareEmptyState
              onPresetClick={(preset) =>
                posthog.capture("compare_items_added", {
                  type_ids: preset.typeIds,
                  item_count: preset.typeIds.length,
                  source: "preset",
                })
              }
            />
          }
        />
      </Stack>
    </Container>
  );
}
