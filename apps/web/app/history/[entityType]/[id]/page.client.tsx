"use client";

import { Text, Title } from "@mantine/core";

import { entityTypeMeta } from "~/lib/history";
import { EntityHistory } from "../../EntityHistory";

/**
 * Generic per-entity timeline for any kind without a bespoke route (category,
 * group, dogmaAttribute, region, …). The explicit `type`/`skin`/`skinMaterial`
 * routes — with richer, icon'd headers — take precedence over this catch-all
 * (Next.js matches static segments before the dynamic `[entityType]`).
 */
export default function EntityHistoryClient({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: number;
}) {
  const meta = entityTypeMeta(entityType);
  return (
    <EntityHistory
      entityType={entityType}
      entityId={entityId}
      renderHeader={() => (
        <div>
          <Title order={2}>
            {meta.label}{" "}
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
