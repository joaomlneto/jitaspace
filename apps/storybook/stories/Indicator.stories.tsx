import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, Group, Stack, Text } from "@mantine/core";
import { IconMail } from "@tabler/icons-react";

import {
  CharacterAvatar,
  StandingIndicator,
  TotalUnreadMailsIndicator,
} from "@jitaspace/ui";

import { SAMPLE } from "./fixtures";

const meta = {
  title: "Components/Indicator",
  component: StandingIndicator,
  args: { standing: 10 },
  argTypes: {
    standing: { control: { type: "range", min: -10, max: 10, step: 0.5 } },
  },
  render: (args) => (
    <StandingIndicator {...args}>
      <CharacterAvatar characterId={SAMPLE.character.id} size="lg" />
    </StandingIndicator>
  ),
} satisfies Meta<typeof StandingIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The in-game standing tag, pinned to an avatar's corner. */
export const Standing: Story = {};

export const StandingTiers: Story = {
  render: () => (
    <Group gap="lg">
      {[10, 2, 0, -2, -10].map((standing) => (
        <Stack key={standing} align="center" gap={4}>
          <StandingIndicator standing={standing}>
            <CharacterAvatar characterId={SAMPLE.character.id} size="lg" />
          </StandingIndicator>
          <Text size="xs" c="dimmed">
            {standing}
          </Text>
        </Stack>
      ))}
    </Group>
  ),
};

/** Hidden when there is nothing unread. */
export const UnreadMails: Story = {
  render: () => (
    <Group gap="xl">
      {[0, 3, 128].map((count) => (
        <TotalUnreadMailsIndicator
          key={count}
          totalUnreadCount={count}
          size={16}
        >
          <Button variant="default" leftSection={<IconMail size={16} />}>
            Mail
          </Button>
        </TotalUnreadMailsIndicator>
      ))}
    </Group>
  ),
};
