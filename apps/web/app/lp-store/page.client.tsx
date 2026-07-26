"use client";

import Link from "next/link";
import {
  Anchor,
  Container,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import posthog from "posthog-js";

import { LPStoreIcon } from "@jitaspace/eve-icons";
import {
  useCharacterLoyaltyPoints,
  useSelectedCharacter,
} from "@jitaspace/hooks";
import { CorporationAvatar } from "@jitaspace/ui";

export interface LPStorePageProps {
  corporations: { corporationId: number; name: string }[];
}

export default function LPStorePage({
  corporations,
}: Readonly<LPStorePageProps>) {
  const theme = useMantineTheme();
  const character = useSelectedCharacter();
  const { hasToken, loyaltyPointsMap, isLoading } = useCharacterLoyaltyPoints(
    character?.characterId ?? 0,
  );

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
          {corporations.map((corporation) => {
            const loyaltyPoints =
              loyaltyPointsMap[corporation.corporationId] ?? 0;
            return (
              <Anchor
                component={Link}
                href={`/lp-store/${corporation.name.replaceAll(" ", "_")}`}
                key={corporation.corporationId}
                onClick={() =>
                  posthog.capture("lp_store_corporation_selected", {
                    corporation_id: corporation.corporationId,
                    corporation_name: corporation.name,
                  })
                }
              >
                <Group wrap="nowrap">
                  <CorporationAvatar
                    corporationId={corporation.corporationId}
                    size="sm"
                  />
                  <Stack gap={0}>
                    <Text>{corporation.name}</Text>
                    {hasToken &&
                      (isLoading ? (
                        <Skeleton height={12} mt={4} width={70} />
                      ) : (
                        <Text
                          c={loyaltyPoints > 0 ? theme.primaryColor : "dimmed"}
                          fw={loyaltyPoints > 0 ? 600 : undefined}
                          size="xs"
                        >
                          {loyaltyPoints.toLocaleString()} LP
                        </Text>
                      ))}
                  </Stack>
                </Group>
              </Anchor>
            );
          })}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
