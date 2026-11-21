import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Group } from "@mantine/core";
import { fn } from "storybook/test";

import { LoginWithEveOnlineButton, MailLabelColorSwatch } from "@jitaspace/ui";

const meta = {
  title: "Components/Miscellaneous",
  component: LoginWithEveOnlineButton,
  args: { size: "large", onClick: fn() },
  argTypes: {
    size: { control: "inline-radio", options: ["large", "small"] },
  },
} satisfies Meta<typeof LoginWithEveOnlineButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** CCP's own SSO button art, in the variant matching the colour scheme. */
export const LoginWithEveOnline: Story = {};

export const MailLabelColors: Story = {
  render: () => (
    <Group gap="xs">
      {[
        "#0000fe",
        "#006634",
        "#0099ff",
        "#00ff33",
        "#660066",
        "#9a0000",
        "#fe0000",
        "#ff6600",
        "#ffff01",
      ].map((color) => (
        <MailLabelColorSwatch key={color} color={color} />
      ))}
      <MailLabelColorSwatch />
    </Group>
  ),
};
