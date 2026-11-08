"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import { Anchor, Badge, Group, Skeleton, Stack, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import type { CorporationPalette } from "../CorporationPalette";
import type { EntityCardVariant, EntityRef } from "./types";
import { CorporationAvatar } from "../Avatar";
import {
  CorporationPaletteStripe,
  corporationPaletteStyles,
  CorporationTickerPaletteBadge,
  getCorporationPaletteSlots,
  useCorporationPaletteVars,
} from "../CorporationPalette";
import { DateHoverCard, FormattedDateText } from "../DateText";
import { EntityCard, EntityCardSection } from "./EntityCard";
import {
  entityCardAvatarProps,
  EntityCardTitle,
  EntityLink,
} from "./EntityLink";

export interface CorporationCardData {
  name?: string;
  ticker?: string;
  alliance?: EntityRef;
  ceo?: EntityRef;
  creator?: EntityRef;
  memberCount?: number;
  /** Percent, e.g. `10` for 10%. */
  taxRate?: number;
  shares?: number;
  dateFounded?: Date;
  warEligible?: boolean;
  /** Plain text; strip the EVE markup first. */
  description?: string;
  url?: string;
  palette?: CorporationPalette | null;
}

export interface CorporationCardDisplayProps {
  corporationId: number;
  /** Omit while loading. */
  corporation?: CorporationCardData;
  variant?: EntityCardVariant;
  headerRightSection?: ReactNode;
}

/** Only links that leave for an http(s) page; ESI's `url` is free text. */
const httpUrl = (value?: string) => {
  if (!value) return undefined;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
};

/**
 * A corporation, dressed in its in-game palette where it has one: a stripe of
 * its colours, a tinted header and a ticker in its main colour.
 */
export const CorporationCardDisplay = memo(
  ({
    corporationId,
    corporation,
    variant = "full",
    headerRightSection,
  }: CorporationCardDisplayProps) => {
    const slots = getCorporationPaletteSlots(corporation?.palette);
    const colors = slots.map(({ color }) => color);
    const hasPalette = slots.length > 0;
    const paletteVars = useCorporationPaletteVars(colors);
    const homepage = httpUrl(corporation?.url);

    let warEligible: string | undefined;
    if (corporation?.warEligible === true) warEligible = "Yes";
    if (corporation?.warEligible === false) warEligible = "No";

    const subtitle = (corporation?.alliance ?? corporation?.ceo) && (
      <>
        <EntityLink kind="alliance" entity={corporation.alliance} c="dimmed" />
        {variant === "full" && (
          <EntityLink
            kind="character"
            entity={corporation.ceo}
            prefix={
              <Text size="xs" c="dimmed">
                CEO
              </Text>
            }
            c="dimmed"
          />
        )}
      </>
    );

    return (
      <EntityCard
        variant={variant}
        loading={!corporation}
        style={paletteVars}
        banner={hasPalette && <CorporationPaletteStripe slots={slots} />}
        headerStyle={hasPalette ? corporationPaletteStyles.wash : undefined}
        avatar={
          <CorporationAvatar
            corporationId={corporationId}
            style={corporationPaletteStyles.logoBacking}
            {...entityCardAvatarProps(variant)}
          />
        }
        title={
          <EntityCardTitle
            kind="corporation"
            entity={{ id: corporationId, name: corporation?.name }}
            variant={variant}
          />
        }
        badges={
          corporation?.ticker ? (
            <CorporationTickerPaletteBadge
              ticker={corporation.ticker}
              colors={colors}
            />
          ) : (
            <Skeleton visible={!corporation} width="auto">
              <Badge>XXXXX</Badge>
            </Skeleton>
          )
        }
        subtitle={subtitle}
        headerRightSection={headerRightSection}
        stats={[
          {
            label: "Members",
            value: corporation?.memberCount?.toLocaleString("en-US"),
          },
          {
            label: "Tax rate",
            value:
              corporation?.taxRate === undefined
                ? undefined
                : `${corporation.taxRate.toFixed(1)}%`,
          },
          {
            label: "Shares",
            value: corporation?.shares?.toLocaleString("en-US"),
          },
          {
            label: "Founded",
            value: corporation?.dateFounded && (
              <DateHoverCard date={corporation.dateFounded}>
                <FormattedDateText
                  date={corporation.dateFounded}
                  format="yyyy-MM-dd"
                  size="xs"
                />
              </DateHoverCard>
            ),
          },
          { label: "War eligible", value: warEligible },
          {
            label: "Founder",
            value: corporation?.creator && (
              <EntityLink kind="character" entity={corporation.creator} />
            ),
          },
        ]}
      >
        {(corporation?.description ?? homepage) && (
          <EntityCardSection>
            <Stack gap="xs">
              {corporation?.description && (
                <Text size="xs" c="dimmed" lineClamp={4}>
                  {corporation.description}
                </Text>
              )}
              {homepage && (
                <Anchor
                  href={homepage}
                  target="_blank"
                  rel="noreferrer"
                  size="xs"
                >
                  <Group gap={4} wrap="nowrap">
                    <IconExternalLink size={14} />
                    <Text size="xs" truncate>
                      {homepage}
                    </Text>
                  </Group>
                </Anchor>
              )}
            </Stack>
          </EntityCardSection>
        )}
      </EntityCard>
    );
  },
);
CorporationCardDisplay.displayName = "CorporationCardDisplay";
