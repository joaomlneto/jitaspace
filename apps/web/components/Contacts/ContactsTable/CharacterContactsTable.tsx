import React from "react";

import { useCharacterContacts } from "@jitaspace/hooks";

import { ContactsTable, type ContactsTableProps } from "./ContactsTable";


export type CharacterContactsTableProps = Omit<
  ContactsTableProps,
  "contacts" | "labels"
> & {
  characterId: number;
};

export const CharacterContactsTable = ({
  characterId,
  ...otherProps
}: CharacterContactsTableProps) => {
  const { data, labels } = useCharacterContacts(characterId);

  return <ContactsTable contacts={data} labels={labels} {...otherProps} />;
};
