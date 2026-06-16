"use client";

import { Text, Title } from "@mantine/core";

import { latestFieldValue } from "~/lib/history";
import { EntityHistory } from "../../EntityHistory";

export default function SkinHistoryClient({
  skinId,
}: Readonly<{ skinId: number }>) {
  return (
    <EntityHistory
      entityType="skin"
      entityId={skinId}
      renderHeader={(timeline) => {
        const name = latestFieldValue(timeline, "internalName");
        return (
          <div>
            <Title order={2}>
              {typeof name === "string" ? name : "Skin"}{" "}
              <Text span c="dimmed">
                #{skinId}
              </Text>
            </Title>
            <Text size="sm" c="dimmed">
              Ship SKIN (paint scheme)
            </Text>
          </div>
        );
      }}
    />
  );
}
