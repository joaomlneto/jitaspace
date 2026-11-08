import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge, Stack, Text } from "@mantine/core";

import {
  EntityCard,
  EntityCardSection,
  EntityCardTitle,
  EntityLink,
  StationAvatar,
} from "@jitaspace/ui";

import { SAMPLE } from "../fixtures";

/**
 * The parts every card above is made of, for building a new one: the
 * `EntityCard` frame, `EntityCardTitle` for its linked title, `EntityLink`
 * for an avatar and linked name on one line, and `EntityCardSection` for
 * further bordered sections.
 */
const meta = {
  title: "Cards/Building Blocks",
  component: EntityCard,
  args: { variant: "full" },
  argTypes: {
    variant: { control: "inline-radio", options: ["full", "compact"] },
  },
  decorators: [(Story) => <div style={{ maxWidth: 480 }}>{Story()}</div>],
} satisfies Meta<typeof EntityCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A station card, put together from the shared parts. */
export const NewCard: Story = {
  args: {
    avatar: (
      <StationAvatar typeId={SAMPLE.jita.stationTypeId} size={84} radius="md" />
    ),
    title: (
      <EntityCardTitle
        kind="solar_system"
        entity={{
          id: SAMPLE.jita.systemId,
          name: "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
        }}
        variant="full"
      />
    ),
    badges: <Badge variant="light">Trade hub</Badge>,
    subtitle: (
      <EntityLink
        kind="corporation"
        entity={SAMPLE.npcCorporation}
        c="dimmed"
      />
    ),
    stats: [
      { label: "Reprocessing efficiency", value: "50%" },
      { label: "Office rent", value: "6,975,848,360 ISK" },
      { label: "Max ship volume", value: null },
    ],
    children: (
      <EntityCardSection>
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            Owner
          </Text>
          <EntityLink kind="faction" entity={SAMPLE.faction} />
        </Stack>
      </EntityCardSection>
    ),
  },
};

/** `EntityLink` for each kind of entity: avatar where it has one, linked name. */
export const Links: Story = {
  // The frame's required args, unused here: this story renders the links alone.
  args: { avatar: null, title: null },
  render: () => (
    <Stack gap={6}>
      <EntityLink kind="character" entity={SAMPLE.character} />
      <EntityLink kind="corporation" entity={SAMPLE.corporation} />
      <EntityLink kind="alliance" entity={SAMPLE.alliance} />
      <EntityLink kind="faction" entity={SAMPLE.faction} />
      <EntityLink kind="type" entity={SAMPLE.types.rifter} />
      <EntityLink
        kind="solar_system"
        entity={{ id: SAMPLE.jita.systemId, name: "Jita" }}
      />
      <EntityLink
        kind="character"
        entity={{ id: SAMPLE.character.id }}
        prefix={
          <Text size="xs" c="dimmed">
            Resolving:
          </Text>
        }
      />
    </Stack>
  ),
};
