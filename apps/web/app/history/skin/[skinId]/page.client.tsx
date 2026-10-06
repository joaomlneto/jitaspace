"use client";

import { Text, Title } from "@mantine/core";

import type { EntityHistoryData } from "~/lib/history-entity-page";
import { EntityHistory } from "../../EntityHistory";

export default function SkinHistoryClient({
  history,
}: Readonly<{ history: EntityHistoryData }>) {
  return (
    <EntityHistory
      history={history}
      renderHeader={({ name, entityId }) => (
        <div>
          <Title order={2}>
            {name ?? "Skin"}{" "}
            <Text span c="dimmed">
              #{entityId}
            </Text>
          </Title>
          <Text size="sm" c="dimmed">
            Ship SKIN (paint scheme)
          </Text>
        </div>
      )}
    />
  );
}
