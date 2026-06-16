"use client";

import type { TextProps } from "@mantine/core";
import React, { memo } from "react";
import { Text } from "@mantine/core";

import { EveEntityName } from "./index";

export type MailingList = {
  mailing_list_id: number;
  name: string;
};

export type EveMailSenderNameProps = TextProps & {
  from?: number;
  mailingLists?: MailingList[];
};

export const EveMailSenderName = memo(
  ({ from, mailingLists, ...otherProps }: EveMailSenderNameProps) => {
    if (!from) {
      return <Text {...otherProps}>Unknown</Text>;
    }

    const mailingListMatch = mailingLists?.find(
      (item) => item.mailing_list_id === from,
    );

    if (mailingListMatch) {
      return <Text {...otherProps}>{mailingListMatch.name}</Text>;
    }

    return <EveEntityName entityId={from} {...otherProps} />;
  },
);
EveMailSenderName.displayName = "EveMailSenderName";
