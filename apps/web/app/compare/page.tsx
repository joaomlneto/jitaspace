"use client";

import { useState } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";
import posthog from "posthog-js";

import { EsiSearchMultiSelect } from "@jitaspace/eve-components";
import { CompareToolIcon } from "@jitaspace/eve-icons";

import { CompareTable } from "~/components/Compare";

export default function Page() {
  const [typeIds, setTypeIds] = useState<number[]>([]);
  return (
    <Container size="xl">
      <Stack>
        <Group>
          <CompareToolIcon width={48} />
          <Title>Compare Tool</Title>
        </Group>
        <EsiSearchMultiSelect
          label="Types to compare"
          categories={["inventory_type"]}
          value={typeIds.map((typeId) => typeId.toString())}
          onChange={(values) => {
            const newIds = values.map(Number);
            setTypeIds(newIds);
            if (newIds.length > typeIds.length) {
              posthog.capture("compare_items_added", {
                type_ids: newIds,
                item_count: newIds.length,
              });
            }
          }}
        />
        <CompareTable typeIds={typeIds} />
      </Stack>
    </Container>
  );
}
