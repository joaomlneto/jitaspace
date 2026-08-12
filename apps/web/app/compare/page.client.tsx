"use client";

import { Container, Group, Stack, Title } from "@mantine/core";
import { parseAsArrayOf, parseAsInteger, useQueryState } from "nuqs";
import posthog from "posthog-js";

import { EsiSearchMultiSelect } from "@jitaspace/eve-components";
import { CompareToolIcon } from "@jitaspace/eve-icons";

import { CompareTable } from "~/components/Compare";

export default function PageClient() {
  // A comparison is inherently something you want to send to someone, so the
  // selected types live in the URL. The integer item-parser also validates:
  // nuqs drops anything it can't parse, so a hand-edited `?types=abc` can't
  // reach the type lookups as NaN.
  const [typeIds, setTypeIds] = useQueryState(
    "types",
    parseAsArrayOf(parseAsInteger)
      .withDefault([])
      .withOptions({ history: "replace" }),
  );

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
            void setTypeIds(newIds);
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
