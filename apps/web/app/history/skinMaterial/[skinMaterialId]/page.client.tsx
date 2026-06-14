"use client";

import { Text, Title } from "@mantine/core";

import { EntityHistory } from "../../EntityHistory";

export default function SkinMaterialHistoryClient({
  skinMaterialId,
}: Readonly<{
  skinMaterialId: number;
}>) {
  return (
    <EntityHistory
      entityType="skinMaterial"
      entityId={skinMaterialId}
      renderHeader={() => (
        <div>
          <Title order={2}>
            Skin material{" "}
            <Text span c="dimmed">
              #{skinMaterialId}
            </Text>
          </Title>
          <Text size="sm" c="dimmed">
            Colour palette shared by SKINs
          </Text>
        </div>
      )}
    />
  );
}
