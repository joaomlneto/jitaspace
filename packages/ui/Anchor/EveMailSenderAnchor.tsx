"use client";

import type { AnchorProps } from "@mantine/core";
import React, { memo } from "react";
import { type LinkProps } from "next/link";
import { Anchor } from "@mantine/core";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type MailingList = {
  mailing_list_id: number;
  name: string;
};

export type EveMailSenderNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    from?: number;
    mailingLists?: MailingList[];
  };

export const EveMailSenderAnchor = memo(
  ({
    from,
    mailingLists,
    children,
    ...props
  }: EveMailSenderNameAnchorProps) => {
    if (mailingLists?.some((mailList) => mailList.mailing_list_id === from)) {
      return <Anchor {...props}>{children}</Anchor>;
    }

    return (
      <EveEntityAnchor entityId={from} {...props}>
        {children}
      </EveEntityAnchor>
    );
  },
);
EveMailSenderAnchor.displayName = "EveMailSenderNameAnchor";
