"use client";

import { memo } from "react";
import { Box, Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";

import { ISKAmount } from "@jitaspace/ui";

import type { ContractSummary } from "./contract";
import { ContractAnchor } from "~/components/Anchor";
import { contractHeadlineIsk } from "./contract";
import classes from "./ContractCard.module.css";
import {
  ContractArtwork,
  contractDisplayName,
  ContractIssuer,
  ContractLocationLine,
  ContractTiming,
  ContractTypeBadge,
  ContractTypeIcon,
  formatVolume,
  RelativeTime,
} from "./ContractParts";

export interface ContractCardProps {
  contract: ContractSummary;
  /**
   * Name structures through ESI. Only for the authenticated characters' own
   * contracts, whose structures they can usually see (see ContractLocationLine).
   */
  resolveStructures?: boolean;
}

/** A secondary amount under the headline: collateral, buyout, volume. */
function Fact({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <Stack gap={0} miw={0}>
      <Text size="xs" c="dimmed" tt="uppercase" className={classes.factLabel}>
        {label}
      </Text>
      <Text component="div" size="sm" fw={500} truncate>
        {children}
      </Text>
    </Stack>
  );
}

/**
 * One contract at a glance, as the contracts browser lists them: what it is
 * (its first item or title), what it costs or pays, where it is, who issued it
 * and when it expires. Works for public contracts from our database and the
 * authenticated characters' own from ESI alike (see ContractSummary).
 */
export const ContractCard = memo(function ContractCard({
  contract,
  resolveStructures = false,
}: Readonly<ContractCardProps>) {
  const headline = contractHeadlineIsk(contract);
  const first = contract.items?.first;
  const isCourier = contract.type === "courier";
  // Without items, the title is already the name (contractDisplayName).
  const showTitle = contract.title && first;

  return (
    <Paper withBorder radius="md" p="md" className={classes.card}>
      <Stack gap="sm" h="100%">
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group gap={6} wrap="nowrap">
            <ContractTypeIcon type={contract.type} size={20} />
            <ContractTypeBadge type={contract.type} size="sm" />
            {contract.forCorporation && (
              <Text size="xs" c="dimmed">
                Corp
              </Text>
            )}
          </Group>
          <ContractTiming contract={contract} size="xs" ta="right" />
        </Group>

        <Group gap="sm" wrap="nowrap" align="flex-start">
          <ContractArtwork type={contract.type} item={first} size={40} />
          <Stack gap={2} miw={0} style={{ flex: 1 }}>
            <ContractAnchor
              contractId={contract.contractId}
              fw={600}
              lineClamp={2}
              className={classes.title}
            >
              {contractDisplayName(contract)}
            </ContractAnchor>
            {showTitle && (
              <Text size="xs" c="dimmed" fs="italic" truncate>
                “{contract.title}”
              </Text>
            )}
          </Stack>
        </Group>

        <Group gap="lg" wrap="nowrap" align="flex-end">
          <Stack gap={0}>
            <Text
              size="xs"
              c="dimmed"
              tt="uppercase"
              className={classes.factLabel}
            >
              {headline.label}
            </Text>
            {headline.amount !== null ? (
              <ISKAmount
                amount={headline.amount}
                fw={700}
                size="lg"
                c="bright"
              />
            ) : (
              <Text fw={700} size="lg" c="dimmed">
                —
              </Text>
            )}
          </Stack>
          {isCourier && contract.collateral !== null && (
            <Fact label="Collateral">
              <ISKAmount amount={contract.collateral} span inherit />
            </Fact>
          )}
          {contract.type === "auction" && contract.buyout !== null && (
            <Fact label="Buyout">
              <ISKAmount amount={contract.buyout} span inherit />
            </Fact>
          )}
          {isCourier && contract.volume !== null && (
            <Fact label="Volume">{formatVolume(contract.volume)}</Fact>
          )}
          {contract.type === "auction" && contract.bidCount !== undefined && (
            <Fact label="Bids">{contract.bidCount}</Fact>
          )}
        </Group>

        <Stack gap={4} mt="auto">
          <ContractLocationLine
            location={contract.start}
            regionName={contract.regionName}
            resolveStructures={resolveStructures}
          />
          {isCourier &&
            contract.end &&
            contract.end.locationId !== contract.start?.locationId && (
              <Group gap={6} wrap="nowrap" miw={0}>
                <IconArrowRight size={14} style={{ flexShrink: 0 }} />
                <Box miw={0}>
                  <ContractLocationLine
                    location={contract.end}
                    resolveStructures={resolveStructures}
                  />
                </Box>
              </Group>
            )}
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <ContractIssuer contract={contract} />
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              <RelativeTime date={contract.dateIssued} />
            </Text>
          </Group>
        </Stack>
      </Stack>
    </Paper>
  );
});

/** A card-shaped placeholder, so the grid keeps its height while loading. */
export function ContractCardSkeleton() {
  return (
    <Paper withBorder radius="md" p="md" className={classes.card}>
      <Stack gap="sm">
        <Skeleton height={20} width="50%" />
        <Group gap="sm" wrap="nowrap">
          <Skeleton height={40} width={40} />
          <Skeleton height={16} style={{ flex: 1 }} />
        </Group>
        <Skeleton height={28} width="40%" />
        <Skeleton height={14} width="80%" />
        <Skeleton height={14} width="60%" />
      </Stack>
    </Paper>
  );
}
