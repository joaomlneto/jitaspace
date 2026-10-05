"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Anchor,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import { AllianceName, CorporationName } from "@jitaspace/eve-components";
import { useCorporation, useSelectedCharacter } from "@jitaspace/hooks";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import { AllianceAvatar, CorporationAvatar } from "@jitaspace/ui";

import { OpenInformationWindowActionIcon } from "~/components/ActionIcon";
import {
  corporationPaletteClasses,
  CorporationPaletteStripe,
  CorporationPaletteSwatches,
  CorporationTickerPaletteBadge,
  getCorporationPaletteColors,
  useCorporationPaletteVars,
} from "~/components/CorporationPalette";
import { MailMessageViewer } from "~/components/EveMail";
import { CorporationAllianceHistoryTimeline } from "~/components/Timeline";

/** Tabs on the corporation detail page, in display order. */
const CORPORATION_TABS = ["description", "history"] as const;
type CorporationTab = (typeof CORPORATION_TABS)[number];
const DEFAULT_CORPORATION_TAB: CorporationTab = "description";

const isCorporationTab = (value: string | null): value is CorporationTab =>
  value != null && (CORPORATION_TABS as readonly string[]).includes(value);

export default function Page() {
  // Keeps the open tab in the URL so a corp's alliance history is linkable.
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(CORPORATION_TABS)
      .withDefault(DEFAULT_CORPORATION_TAB)
      .withOptions({ history: "replace" }),
  );
  const params = useParams();
  const rawCorporationId = params.corporationId;
  const corporationId = Number(
    typeof rawCorporationId === "string"
      ? rawCorporationId
      : rawCorporationId?.[0],
  );
  const character = useSelectedCharacter();
  const { data: corporation } = useCorporation(corporationId);
  const paletteColors = getCorporationPaletteColors(corporation?.data.palette);
  const hasPalette = paletteColors.length > 0;
  const paletteVars = useCorporationPaletteVars(paletteColors);

  if (!Number.isFinite(corporationId)) {
    return null;
  }

  return (
    <Container size="sm">
      <Stack>
        <Card withBorder radius="md" p={0} style={paletteVars}>
          {hasPalette && <CorporationPaletteStripe colors={paletteColors} />}
          <Group
            gap="xl"
            px="lg"
            py="md"
            wrap="nowrap"
            className={hasPalette ? corporationPaletteClasses.wash : undefined}
            data-testid="corporation-header"
          >
            <CorporationAvatar
              corporationId={corporationId}
              size="xl"
              radius="md"
              className={corporationPaletteClasses.logoBacking}
            />
            <Group gap="md">
              <Title order={3}>
                <CorporationName span inherit corporationId={corporationId} />
              </Title>
              {corporation?.data.ticker && (
                <CorporationTickerPaletteBadge
                  ticker={corporation.data.ticker}
                  colors={paletteColors}
                />
              )}
              {character && (
                <OpenInformationWindowActionIcon
                  characterId={character.characterId}
                  entityId={corporationId}
                />
              )}
            </Group>
          </Group>
        </Card>
        <Group>
          <Link
            href={`https://evemaps.dotlan.net/corp/${corporationId}`}
            target="_blank"
          >
            <Button>
              <Group gap="xs">
                <IconExternalLink size={14} />
                DOTLAN EveMaps
              </Group>
            </Button>
          </Link>
          <Link
            href={`https://evewho.com/corporation/${corporationId}`}
            target="_blank"
          >
            <Button>
              <Group gap="xs">
                <IconExternalLink size={14} />
                EveWho
              </Group>
            </Button>
          </Link>
          <Link
            href={`https://zkillboard.com/corporation/${corporationId}`}
            target="_blank"
          >
            <Button>
              <Group gap="xs">
                <IconExternalLink size={14} />
                zKillboard
              </Group>
            </Button>
          </Link>
        </Group>
        {corporation?.data.alliance_id && (
          <Group justify="space-between">
            <Text>Alliance</Text>
            <Group>
              <AllianceAvatar
                allianceId={corporation.data.alliance_id}
                size="sm"
              />
              <Anchor
                component={Link}
                href={`/alliance/${corporation.data.alliance_id}`}
              >
                <AllianceName allianceId={corporation.data.alliance_id} />
              </Anchor>
            </Group>
          </Group>
        )}
        {paletteColors.length > 0 && (
          <Group justify="space-between">
            <Text>Colors</Text>
            <CorporationPaletteSwatches colors={paletteColors} />
          </Group>
        )}
        <Tabs
          value={activeTab}
          onChange={(value) => {
            if (isCorporationTab(value)) void setActiveTab(value);
          }}
        >
          <Tabs.List>
            <Tabs.Tab value="description">Description</Tabs.Tab>
            <Tabs.Tab value="history">Alliance History</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="description">
            {corporation?.data && (
              <MailMessageViewer
                content={
                  corporation.data.description
                    ? sanitizeFormattedEveString(corporation.data.description)
                    : "No description"
                }
              />
            )}
          </Tabs.Panel>
          <Tabs.Panel value="history" pt="xl">
            {
              <Container>
                <CorporationAllianceHistoryTimeline
                  corporationId={corporationId}
                />
              </Container>
            }
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
