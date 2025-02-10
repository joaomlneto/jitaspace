import React, { useState, type ReactElement } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { CompareToolIcon } from "@jitaspace/eve-icons";
import { EsiSearchMultiSelect } from "@jitaspace/ui";

import { CompareTable } from "~/components/Compare";
import { MainLayout } from "~/layouts";


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
          onChange={(values) => setTypeIds(values.map(Number))}
        />
        <CompareTable typeIds={typeIds} />
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return (
    <MainLayout>
      <NextSeo title="Agents" />
      {page}
    </MainLayout>
  );
};
