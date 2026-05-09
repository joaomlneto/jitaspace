"use client";

import type { TextProps } from "@mantine/core";
import React, { memo } from "react";
import { Text } from "@mantine/core";

import {
  CharactersCharacterIdMailListsGet,
  CharactersCharacterIdMailMailIdGet,
} from "@jitaspace/esi-client";

import { EveEntityName } from "./index";

export type EveMailSenderNameProps = TextProps & {
  from?: CharactersCharacterIdMailMailIdGet["from"];
  mailingLists?: CharactersCharacterIdMailListsGet;
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
