import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Group } from "@mantine/core";
import { fn } from "storybook/test";

import {
  OpenInformationWindowActionIcon,
  OpenMarketWindowActionIcon,
  SetAutopilotDestinationActionIcon,
} from "@jitaspace/ui";

const meta = {
  title: "Components/Action Icon",
  component: OpenInformationWindowActionIcon,
  parameters: {
    docs: {
      description: {
        component:
          "Icon buttons that drive the EVE client through ESI's UI endpoints, each with a tooltip. Without a handler (or with `disabled`) they stay focusable but inert, so the tooltip still explains what they would do.",
      },
    },
  },
  args: { onOpen: fn(), disabled: false },
} satisfies Meta<typeof OpenInformationWindowActionIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpenInformationWindow: Story = {};

export const Disabled: Story = { args: { disabled: true } };

export const EveClientActions: Story = {
  render: () => (
    <Group>
      <OpenInformationWindowActionIcon onOpen={fn()} />
      <OpenMarketWindowActionIcon onOpen={fn()} />
      <SetAutopilotDestinationActionIcon onSet={fn()} />
      <SetAutopilotDestinationActionIcon onSet={fn()} variant="filled" />
    </Group>
  ),
};

/** Without a handler: inert, but the tooltip still shows on hover and focus. */
export const WithoutHandler: Story = {
  render: () => (
    <Group>
      <OpenInformationWindowActionIcon />
      <OpenMarketWindowActionIcon />
      <SetAutopilotDestinationActionIcon />
    </Group>
  ),
};
