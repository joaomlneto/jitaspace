import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SimpleGrid, Stack } from "@mantine/core";

import {
  AllianceCardDisplay,
  CharacterCardDisplay,
  CorporationCardDisplay,
  KillmailCardDisplay,
  TypeCardDisplay,
  WarCardDisplay,
  warStatus,
} from "@jitaspace/ui";

import {
  ALLIANCE,
  CHARACTER,
  CORPORATION,
  KILLMAIL,
  TYPE,
  WAR,
} from "../cardFixtures";

const war = { ...WAR.data, status: warStatus(WAR.data, new Date()) };

/**
 * Every entity card shares one frame (`EntityCard`): avatar, title and badges,
 * subtitle lines, stats and further sections, in a `full` and a single-row
 * `compact` variant. The cards take plain props; their data-fetching twins in
 * `@jitaspace/eve-components` fill them from ESI.
 */
const meta = {
  title: "Cards/Overview",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {
  render: () => (
    <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
      <AllianceCardDisplay allianceId={ALLIANCE.id} alliance={ALLIANCE.data} />
      <CorporationCardDisplay
        corporationId={CORPORATION.id}
        corporation={CORPORATION.data}
      />
      <CharacterCardDisplay
        characterId={CHARACTER.id}
        character={CHARACTER.data}
      />
      <WarCardDisplay warId={WAR.id} war={war} />
      <TypeCardDisplay typeId={TYPE.id} type={TYPE.data} />
      <KillmailCardDisplay killmailId={KILLMAIL.id} killmail={KILLMAIL.data} />
    </SimpleGrid>
  ),
};

/** The single-row variant, for lists and hover previews. */
export const Compact: Story = {
  render: () => (
    <Stack maw={420} gap="xs">
      <AllianceCardDisplay
        variant="compact"
        allianceId={ALLIANCE.id}
        alliance={ALLIANCE.data}
      />
      <CorporationCardDisplay
        variant="compact"
        corporationId={CORPORATION.id}
        corporation={CORPORATION.data}
      />
      <CharacterCardDisplay
        variant="compact"
        characterId={CHARACTER.id}
        character={CHARACTER.data}
      />
      <WarCardDisplay variant="compact" warId={WAR.id} war={war} />
      <TypeCardDisplay variant="compact" typeId={TYPE.id} type={TYPE.data} />
      <KillmailCardDisplay
        variant="compact"
        killmailId={KILLMAIL.id}
        killmail={KILLMAIL.data}
      />
    </Stack>
  ),
};

/** Before their data arrives: names and stats are skeletons. */
export const Loading: Story = {
  render: () => (
    <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
      <AllianceCardDisplay allianceId={ALLIANCE.id} />
      <CorporationCardDisplay corporationId={CORPORATION.id} />
      <CharacterCardDisplay characterId={CHARACTER.id} />
      <WarCardDisplay warId={WAR.id} />
      <TypeCardDisplay typeId={TYPE.id} />
      <KillmailCardDisplay killmailId={KILLMAIL.id} />
    </SimpleGrid>
  ),
};
