import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@mantine/core";

import { AllianceCardDisplay } from "@jitaspace/ui";

import { ALLIANCE } from "../cardFixtures";

const meta = {
  title: "Cards/Alliance",
  component: AllianceCardDisplay,
  args: { allianceId: ALLIANCE.id, alliance: ALLIANCE.data, variant: "full" },
  argTypes: {
    variant: { control: "inline-radio", options: ["full", "compact"] },
  },
  decorators: [(Story) => <div style={{ maxWidth: 480 }}>{Story()}</div>],
} satisfies Meta<typeof AllianceCardDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 807 member corporations: the card lists 24 and counts the rest. */
export const Full: Story = {};

export const Compact: Story = { args: { variant: "compact" } };

export const Loading: Story = { args: { alliance: undefined } };

/** `headerRightSection` holds actions, e.g. the home page's. */
export const WithHeaderAction: Story = {
  args: {
    headerRightSection: (
      <Button size="xs" variant="light">
        Contacts
      </Button>
    ),
  },
};
