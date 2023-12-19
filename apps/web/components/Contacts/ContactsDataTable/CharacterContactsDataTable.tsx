import React from "react";

import { useCharacterContacts } from "@jitaspace/hooks";

import {
  ContactsDataTable,
  type ContactsDataTableProps,
} from "./ContactsDataTable";


export type CharacterContactsDataTableProps = Omit<
  ContactsDataTableProps,
  "contacts" | "labels"
> & {
  characterId: number;
};

export const CharacterContactsDataTable = ({
  characterId,
  ...otherProps
}: CharacterContactsDataTableProps) => {
  const { data, labels } = useCharacterContacts(characterId);

  return <ContactsDataTable contacts={data} labels={labels} {...otherProps} />;
};
