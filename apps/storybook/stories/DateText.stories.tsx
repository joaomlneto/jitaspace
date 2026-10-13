import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Group, Stack, Text } from "@mantine/core";

import {
  CalendarEventHumanDurationText,
  DateHoverCard,
  FormattedDateText,
  HumanDurationText,
  TimeAgoText,
} from "@jitaspace/ui";

const meta = {
  title: "Components/Date & Duration",
  component: FormattedDateText,
  args: {
    date: new Date("2003-05-06T12:00:00Z"),
    format: "yyyy-MM-dd HH:mm:ss",
  },
  argTypes: { date: { control: "date" } },
} satisfies Meta<typeof FormattedDateText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FormattedDate: Story = {
  render: ({ date, ...args }) => (
    // The date control hands the story a timestamp, not a Date.
    <FormattedDateText {...args} date={date ? new Date(date) : undefined} />
  ),
};

export const FormattedDateLoading: Story = {
  args: { date: undefined },
};

/** Ticks every second. */
export const TimeAgo: Story = {
  render: () => {
    const now = Date.now();
    return (
      <Stack gap={4}>
        <TimeAgoText date={new Date(now - 42_000)} addSuffix />
        <TimeAgoText date={new Date(now - 3 * 3_600_000)} addSuffix />
        <TimeAgoText date={new Date(now + 5 * 86_400_000)} addSuffix />
        <TimeAgoText
          date={new Date("2003-05-06T12:00:00Z")}
          addSuffix
          unit="day"
        />
      </Stack>
    );
  },
};

/** Hover the date to see it in local time and EVE time (UTC). */
export const HoverCard: Story = {
  render: () => {
    const date = new Date(Date.now() - 2 * 3_600_000);
    return (
      <Group>
        <DateHoverCard date={date}>
          <TimeAgoText date={date} addSuffix td="underline dotted" />
        </DateHoverCard>
      </Group>
    );
  },
};

export const Durations: Story = {
  render: () => (
    <Stack gap={4}>
      {[45_000, 3_600_000, 5_400_000, 86_400_000 * 3 + 7_200_000].map(
        (duration) => (
          <Group key={duration} gap="xs">
            <Text size="sm" c="dimmed" w={90} ff="monospace">
              {duration}
            </Text>
            <HumanDurationText duration={duration} size="sm" />
          </Group>
        ),
      )}
      <Group gap="xs">
        <Text size="sm" c="dimmed" w={90} ff="monospace">
          largest: 2
        </Text>
        <HumanDurationText
          duration={86_400_000 * 3 + 7_260_000}
          options={{ largest: 2 }}
          size="sm"
        />
      </Group>
    </Stack>
  ),
};

export const CalendarEventDuration: Story = {
  render: () => (
    <Stack gap={4}>
      <CalendarEventHumanDurationText durationMs={7_200_000} />
      <CalendarEventHumanDurationText durationMs={0} />
      <CalendarEventHumanDurationText />
    </Stack>
  ),
};
