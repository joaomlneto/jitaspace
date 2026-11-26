import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { OpenInformationWindowAnchor } from "@jitaspace/ui";

/**
 * The one anchor left in `@jitaspace/ui`: it asks the EVE client to open an
 * information window rather than linking to a page. The entity anchors that
 * link to the web app's pages live in `apps/web/components/Anchor`.
 */
const meta = {
  title: "Components/Anchor",
  component: OpenInformationWindowAnchor,
  args: { onOpen: fn(), disabled: false, children: "Show info in game" },
} satisfies Meta<typeof OpenInformationWindowAnchor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A button styled as a link: it is an action, not a navigation. */
export const OpenInformationWindow: Story = {};

/** Disabled, it stays focusable but inert, and dims. */
export const Disabled: Story = { args: { disabled: true } };
