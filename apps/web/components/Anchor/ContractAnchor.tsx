"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import type React from "react";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

export type ContractAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    contractId?: number | null;
  };

export const ContractAnchor = memo(
  ({ contractId, children, prefetch, ...otherProps }: ContractAnchorProps) => {
    // While the id is nullish the children render unlinked, so the href never
    // reads `/contracts/undefined` (see CorporationAnchor).
    if (contractId === null || contractId === undefined) {
      return <Anchor {...otherProps}>{children}</Anchor>;
    }

    return (
      <Anchor
        component={HoverPrefetchLink}
        href={`/contracts/${contractId}`}
        prefetch={prefetch}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
ContractAnchor.displayName = "ContractAnchor";
