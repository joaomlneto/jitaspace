import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Stack } from "@mantine/core";

import type { WarStatus } from "@jitaspace/ui";
import { WarCardDisplay, warStatus } from "@jitaspace/ui";

import { ALLIANCE, WAR } from "../cardFixtures";

const meta = {
  title: "Cards/War",
  component: WarCardDisplay,
  args: {
    warId: WAR.id,
    war: { ...WAR.data, status: warStatus(WAR.data, new Date()) },
    variant: "full",
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["full", "compact"] },
  },
  decorators: [(Story) => <div style={{ maxWidth: 520 }}>{Story()}</div>],
} satisfies Meta<typeof WarCardDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {};

export const Compact: Story = { args: { variant: "compact" } };

/**
 * Illustrative: this war had no allies, so two real alliances stand in to
 * show the defender's allies section.
 */
export const WithAllies: Story = {
  args: {
    war: {
      ...WAR.data,
      status: "active",
      finished: undefined,
      mutual: false,
      allies: [
        {
          kind: "alliance",
          entity: { id: ALLIANCE.id, name: ALLIANCE.data.name },
        },
        {
          kind: "alliance",
          entity: { id: 498125261, name: "Test Alliance Please Ignore" },
        },
      ],
    },
  },
};

/** Every status, as `warStatus()` derives it from the war's dates. */
export const Statuses: Story = {
  render: () => (
    <Stack gap="xs">
      {(["declared", "active", "ending", "finished"] satisfies WarStatus[]).map(
        (status) => (
          <WarCardDisplay
            key={status}
            variant="compact"
            warId={WAR.id}
            war={{ ...WAR.data, status }}
          />
        ),
      )}
    </Stack>
  ),
};

export const Loading: Story = { args: { war: undefined } };
