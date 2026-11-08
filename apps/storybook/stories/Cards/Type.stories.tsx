import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TypeCardDisplay } from "@jitaspace/ui";

import { TYPE } from "../cardFixtures";

const meta = {
  title: "Cards/Type",
  component: TypeCardDisplay,
  args: { typeId: TYPE.id, type: TYPE.data, variant: "full" },
  argTypes: {
    variant: { control: "inline-radio", options: ["full", "compact"] },
    imageVariation: { control: "inline-radio", options: ["icon", "render"] },
  },
  decorators: [(Story) => <div style={{ maxWidth: 480 }}>{Story()}</div>],
} satisfies Meta<typeof TypeCardDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {};

/** Ships and structures have a 3D render as well as an icon. */
export const Render: Story = { args: { imageVariation: "render" } };

export const Compact: Story = { args: { variant: "compact" } };

export const Unpublished: Story = {
  args: { type: { ...TYPE.data, unpublished: true, price: undefined } },
};

export const Loading: Story = { args: { type: undefined } };
