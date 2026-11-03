"use client";

import { Text, Title } from "@mantine/core";

import type { EntityHistoryData } from "~/lib/history-entity-page";
import { entityTypeMeta } from "~/lib/history";
import { EntityHistory } from "../../EntityHistory";

/**
 * Generic per-entity timeline for any kind without a bespoke route (category,
 * group, dogmaAttribute, region, …). The explicit `skin`/`skinMaterial` routes
 * — with richer headers — take precedence over this catch-all (Next.js matches
 * static segments before the dynamic `[entityType]`). Items are not served
 * here: an item's history is its item page's History tab.
 */
export default function EntityHistoryClient({
  history,
}: Readonly<{ history: EntityHistoryData }>) {
  const meta = entityTypeMeta(history.entityType);
  return (
    <EntityHistory
      history={history}
      renderHeader={({ name, entityId }) => (
        <div>
          <Title order={2}>
            {name ?? meta.label}{" "}
            <Text span c="dimmed">
              #{entityId}
            </Text>
          </Title>
          <Text size="sm" c="dimmed">
            {meta.label} change history
          </Text>
        </div>
      )}
    />
  );
}
