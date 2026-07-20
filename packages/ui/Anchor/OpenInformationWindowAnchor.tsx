"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

export type OpenInformationWindowAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    onOpen?: () => void;
    disabled?: boolean;
  };

export const OpenInformationWindowAnchor = memo(
  ({
    onOpen,
    disabled,
    children,
    ...props
  }: OpenInformationWindowAnchorProps) => {
    return (
      <Anchor {...props} onClick={disabled ? undefined : onOpen}>
        {children}
      </Anchor>
    );
  },
);
OpenInformationWindowAnchor.displayName = "OpenInformationWindowAnchor";
