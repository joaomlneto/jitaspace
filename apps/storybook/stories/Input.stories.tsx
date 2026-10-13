import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Stack } from "@mantine/core";
import { fn } from "storybook/test";

import {
  CalendarEventAttendanceSelect,
  EveMailLabelMultiSelect,
  MailLabelColorSelect,
} from "@jitaspace/ui";

import { MAIL_LABELS } from "./fixtures";

const meta = {
  title: "Components/Input",
  component: CalendarEventAttendanceSelect,
  args: {
    label: "Your response",
    eventTitle: "Saturday home defence fleet",
    initialResponse: "tentative",
    canRespond: true,
    isLoading: false,
    onRespond: fn(),
    w: 260,
  },
} satisfies Meta<typeof CalendarEventAttendanceSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Changing the response asks for confirmation in a modal first. */
export const CalendarEventAttendance: Story = {};

export const CalendarEventAttendanceReadOnly: Story = {
  args: { canRespond: false, initialResponse: "accepted" },
};

export const CalendarEventAttendanceLoading: Story = {
  args: { isLoading: true },
};

/** System labels are shown by their human names (`[Corp]` → Corporation). */
export const MailLabels: Story = {
  render: function Render() {
    const [value, setValue] = useState<string[]>(["1", "16"]);
    return (
      <EveMailLabelMultiSelect
        labels={MAIL_LABELS}
        value={value}
        onChange={setValue}
        w={360}
      />
    );
  },
};

/** The 18 colours the EVE client allows for mail labels. */
export const MailLabelColor: Story = {
  render: function Render() {
    const [color, setColor] = useState("#0099ff");
    return (
      <Stack gap="xs">
        <MailLabelColorSelect
          label="Label colour"
          value={color}
          onChange={setColor}
        />
      </Stack>
    );
  },
};
