"use client";

import Link from "next/link";
import { Anchor, Group, Image, Text, Title } from "@mantine/core";

import { TypeName } from "../../_sde-ui";

import { EntityHistory } from "../../EntityHistory";

export default function TypeHistoryClient({ typeId }: { typeId: number }) {
  return (
    <EntityHistory
      entityType="type"
      entityId={typeId}
      renderHeader={() => (
        <Group gap="sm">
          <Image
            src={`https://images.evetech.net/types/${typeId}/icon?size=64`}
            alt=""
            w={48}
            h={48}
            fallbackSrc="https://images.evetech.net/types/0/icon?size=64"
          />
          <div>
            <Title order={2}>
              <TypeName span typeId={typeId} />{" "}
              <Text span c="dimmed">
                #{typeId}
              </Text>
            </Title>
            <Anchor component={Link} href={`/type/${typeId}`} size="sm">
              View item page →
            </Anchor>
          </div>
        </Group>
      )}
    />
  );
}
