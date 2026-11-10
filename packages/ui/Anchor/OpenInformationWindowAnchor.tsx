"use client";

import type { AnchorProps } from "@mantine/core";
import type { ComponentPropsWithoutRef } from "react";
import { memo } from "react";
import { Anchor } from "@mantine/core";

export type OpenInformationWindowAnchorProps = AnchorProps &
  Omit<
    ComponentPropsWithoutRef<"button">,
    keyof AnchorProps | "onClick" | "disabled" | "type"
  > & {
    onOpen?: () => void;
    disabled?: boolean;
  };

/**
 * Text that asks the EVE client to open an information window. It is an
 * action, not a navigation, so it renders a `<button>` styled as a link: an
 * `<a>` without an `href` is skipped by the keyboard and not announced as a
 * control.
 *
 * Disabled, it stays focusable with `aria-disabled` and dimmed text, like
 * TooltipActionIcon, so it can still be found and its state read.
 */
export const OpenInformationWindowAnchor = memo(
  ({
    onOpen,
    disabled,
    children,
    ...props
  }: OpenInformationWindowAnchorProps) => {
    return (
      <Anchor
        component="button"
        type="button"
        {...(disabled
          ? { c: "dimmed", style: { cursor: "not-allowed" } }
          : undefined)}
        {...props}
        aria-disabled={disabled ? true : undefined}
        data-disabled={disabled ? true : undefined}
        onClick={disabled ? undefined : onOpen}
      >
        {children}
      </Anchor>
    );
  },
);
OpenInformationWindowAnchor.displayName = "OpenInformationWindowAnchor";
