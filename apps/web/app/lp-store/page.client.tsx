"use client";

import Link from "next/link";
import {
  Anchor,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { LPStoreIcon } from "@jitaspace/eve-icons";
import { CorporationAvatar } from "@jitaspace/ui";

export interface LPStorePageProps {
  corporations: { corporationId: number; name: string }[];
}

export default function LPStorePage({ corporations }: LPStorePageProps) {
  return (
    <Container size="xl">
      <Stack>
        <Group>
          <LPStoreIcon width={48} />
          <Title>LP Store</Title>
        </Group>
        <Title order={3}>
          Select a corporation below or{" "}
          <Anchor inherit component={Link} href="/lp-store/all">
            show all offers
          </Anchor>
        </Title>
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }}>
          {corporations.map((corporation) => (
            <Anchor
              component={Link}
              href={`/lp-store/${corporation.name.replaceAll(" ", "_")}`}
              key={corporation.corporationId}
            >
              <Group>
                <CorporationAvatar
                  corporationId={corporation.corporationId}
                  size="sm"
                />
                <Text>{corporation.name}</Text>
              </Group>
            </Anchor>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
