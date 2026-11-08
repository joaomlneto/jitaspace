import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Anchor, Group, Stack, Table, Text } from "@mantine/core";
import { fn } from "storybook/test";

import {
  AllianceAnchor,
  AllianceAvatar,
  BloodlineAnchor,
  CategoryAnchor,
  CharacterAvatar,
  CorporationAnchor,
  DogmaAttributeAnchor,
  DogmaEffectAnchor,
  DungeonAnchor,
  EpicArcAnchor,
  EveEntityAnchorDisplay,
  EveEntityNameDisplay,
  GroupAnchor,
  HoverPrefetchLink,
  MarketGroupAnchor,
  MissionAnchor,
  OpenInformationWindowAnchor,
  RaceAnchor,
  StarAnchor,
  TypeListAnchor,
  WarAnchor,
} from "@jitaspace/ui";

import { SAMPLE } from "./fixtures";

const meta = {
  title: "Components/Anchor",
  component: EveEntityAnchorDisplay,
  parameters: {
    docs: {
      description: {
        component:
          "`next/link` anchors to JitaSpace's own pages. Each one builds the route from an id; the hrefs below are what they link to.",
      },
    },
  },
  args: {
    href: `/character/${SAMPLE.character.id}`,
    children: SAMPLE.character.name,
  },
} satisfies Meta<typeof EveEntityAnchorDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EntityAnchor: Story = {};

/** The usual pairing in the app: an avatar next to a linked name. */
export const WithAvatar: Story = {
  render: () => (
    <Stack gap="xs">
      <Group gap="xs">
        <CharacterAvatar characterId={SAMPLE.character.id} size="sm" />
        <EveEntityAnchorDisplay href={`/character/${SAMPLE.character.id}`}>
          <EveEntityNameDisplay name={SAMPLE.character.name} />
        </EveEntityAnchorDisplay>
      </Group>
      <Group gap="xs">
        <AllianceAvatar allianceId={SAMPLE.alliance.id} size="sm" />
        <AllianceAnchor allianceId={SAMPLE.alliance.id}>
          <EveEntityNameDisplay name={SAMPLE.alliance.name} />
        </AllianceAnchor>
      </Group>
    </Stack>
  ),
};

export const Routes: Story = {
  render: () => {
    const anchors = [
      [
        "AllianceAnchor",
        <AllianceAnchor key="a" allianceId={SAMPLE.alliance.id}>
          {SAMPLE.alliance.name}
        </AllianceAnchor>,
      ],
      [
        "CorporationAnchor",
        <CorporationAnchor key="c" corporationId={SAMPLE.npcCorporation.id}>
          {SAMPLE.npcCorporation.name}
        </CorporationAnchor>,
      ],
      [
        "RaceAnchor",
        <RaceAnchor key="r" raceId={1}>
          Caldari
        </RaceAnchor>,
      ],
      [
        "BloodlineAnchor",
        <BloodlineAnchor key="b" bloodlineId={1}>
          Deteis
        </BloodlineAnchor>,
      ],
      [
        "CategoryAnchor",
        <CategoryAnchor key="cat" categoryId={6}>
          Ship
        </CategoryAnchor>,
      ],
      [
        "GroupAnchor",
        <GroupAnchor key="g" groupId={25}>
          Frigate
        </GroupAnchor>,
      ],
      [
        "MarketGroupAnchor",
        <MarketGroupAnchor key="mg" marketGroupId={4}>
          Ships
        </MarketGroupAnchor>,
      ],
      [
        "TypeListAnchor",
        <TypeListAnchor key="tl" typeListId={1}>
          Type list 1
        </TypeListAnchor>,
      ],
      [
        "DogmaAttributeAnchor",
        <DogmaAttributeAnchor key="da" attributeId={9}>
          Structure Hitpoints
        </DogmaAttributeAnchor>,
      ],
      [
        "DogmaEffectAnchor",
        <DogmaEffectAnchor key="de" effectId={11}>
          Low power
        </DogmaEffectAnchor>,
      ],
      [
        "StarAnchor",
        <StarAnchor key="s" starId={40009076}>
          Jita - Star
        </StarAnchor>,
      ],
      [
        "WarAnchor",
        <WarAnchor key="w" warId={SAMPLE.war.id}>
          War {SAMPLE.war.id}
        </WarAnchor>,
      ],
      [
        "MissionAnchor",
        <MissionAnchor key="m" missionId={1}>
          Mission 1
        </MissionAnchor>,
      ],
      [
        "DungeonAnchor",
        <DungeonAnchor key="d" dungeonId={1}>
          Dungeon 1
        </DungeonAnchor>,
      ],
      [
        "EpicArcAnchor",
        <EpicArcAnchor key="ea" epicArcId={1}>
          Epic arc 1
        </EpicArcAnchor>,
      ],
    ] as const;
    return (
      <Table w="auto">
        <Table.Tbody>
          {anchors.map(([name, anchor]) => (
            <Table.Tr key={name}>
              <Table.Td>
                <code>{name}</code>
              </Table.Td>
              <Table.Td>{anchor}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    );
  },
};

/** Without an id there is nowhere to link to, so only the children render. */
export const WithoutId: Story = {
  render: () => (
    <Stack gap={4}>
      <CorporationAnchor corporationId={null}>
        Corporation without an id (plain anchor)
      </CorporationAnchor>
      <Text>
        <CategoryAnchor>
          Category without an id (no anchor at all)
        </CategoryAnchor>
      </Text>
    </Stack>
  ),
};

/**
 * Asks the EVE client to open its information window; no navigation, so it is
 * a button styled as a link. Disabled, it stays focusable but inert.
 */
export const OpenInformationWindow: Story = {
  render: () => (
    <Group>
      <OpenInformationWindowAnchor onOpen={fn()}>
        Show info in game
      </OpenInformationWindowAnchor>
      <OpenInformationWindowAnchor onOpen={fn()} disabled>
        Disabled
      </OpenInformationWindowAnchor>
    </Group>
  ),
};

/**
 * The `next/link` every anchor above renders. It prefetches its destination
 * only on hover, touch or focus, not as soon as it scrolls into view, so links
 * repeated on every page do not each cost requests on every page view.
 */
export const HoverPrefetch: Story = {
  render: () => (
    <Group>
      <Anchor component={HoverPrefetchLink} href="/categories">
        Inventory
      </Anchor>
      <Anchor component={HoverPrefetchLink} href="/category/6" prefetch={false}>
        Never prefetched (explicit prefetch wins)
      </Anchor>
    </Group>
  ),
};
