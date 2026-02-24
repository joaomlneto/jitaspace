"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Anchor,
  Button,
  Container,
  Group,
  Loader,
  Spoiler,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import {
  useFuzzworkTypeMarketStats,
  useMarketPrices,
  useSelectedCharacter,
  useType,
} from "@jitaspace/hooks";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  ISKAmount,
  OpenMarketWindowActionIcon,
  TypeAvatar,
  TypeInventoryBreadcrumbs,
  TypeMarketBreadcrumbs,
} from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";

export interface PageProps {
  typeId: number;
  ogImageUrl?: string;
  typeName?: string;
  typeDescription?: string;
}

export default function TypePage({
  typeId,
  typeName,
  typeDescription,
}: PageProps) {
  const character = useSelectedCharacter();
  const { data: type } = useType(typeId);
  const { data: marketPrices } = useMarketPrices();
  const [regionId, _setRegionId] = useState(10000002);
  const { data: marketStats } = useFuzzworkTypeMarketStats(typeId, regionId);

  if (!typeId) {
    return (
      <Container size="sm">
        <Group>
          <Loader />
          <Text>Loading type information...</Text>
        </Group>
      </Container>
    );
  }

  return (
    <Container size="sm">
      <Stack>
        <Group gap="xl">
          <TypeAvatar typeId={typeId} size="lg" />
          <Title order={1}>{typeName}</Title>
          {character && (
            <OpenMarketWindowActionIcon
              characterId={character.characterId}
              typeId={typeId}
            />
          )}
        </Group>
        <Stack gap={0}>
          <TypeInventoryBreadcrumbs typeId={typeId} />
          <TypeMarketBreadcrumbs typeId={typeId} />
        </Stack>
        <Group>
          <Link href={`https://www.everef.net/type/${typeId}`} target="_blank">
            <Button size="xs">
              <Group gap="xs">
                <IconExternalLink size={14} />
                Eve Ref
              </Group>
            </Button>
          </Link>
          <Link href={`https://evetycoon.com/market/${typeId}`} target="_blank">
            <Button size="xs">
              <Group gap="xs">
                <IconExternalLink size={14} />
                EVE Tycoon
              </Group>
            </Button>
          </Link>
        </Group>
        {type?.data.description && (
          <Spoiler maxHeight={120} showLabel="Show more" hideLabel="Show less">
            <MailMessageViewer
              content={
                type.data.description
                  ? sanitizeFormattedEveString(type.data.description)
                  : "No description"
              }
            />
          </Spoiler>
        )}
        {marketPrices[typeId] && (
          <>
            <Group justify="space-between">
              <Text>Average Price</Text>
              <Text>
                {marketPrices[typeId]?.average_price?.toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                )}{" "}
                ISK
              </Text>
            </Group>
            <Group justify="space-between">
              <Text>Adjusted Price</Text>
              <Text>
                {marketPrices[typeId]?.adjusted_price?.toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                )}{" "}
                ISK
              </Text>
            </Group>
            {marketStats && (
              <>
                <Title order={6}>
                  Market Statistics (powered by{" "}
                  <Anchor href="https://www.fuzzwork.co.uk" target="_blank">
                    fuzzwork.co.uk
                  </Anchor>
                  )
                </Title>
                <Group justify="space-between">
                  <Text>Jita Buy</Text>
                  <Text>
                    <ISKAmount amount={marketStats.buy.percentile} />
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text>Jita Split</Text>
                  <Text>
                    <ISKAmount
                      amount={
                        (marketStats.buy.percentile +
                          marketStats.sell.percentile) /
                        2
                      }
                    />
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text>Jita Sell</Text>
                  <Text>
                    <ISKAmount amount={marketStats.sell.percentile} />
                  </Text>
                </Group>
              </>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
