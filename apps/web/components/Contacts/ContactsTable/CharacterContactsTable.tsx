import React from "react";

import { useCharacterContacts } from "@jitaspace/esi-hooks";

import { ContactsTable, type ContactsTableProps } from "./ContactsTable";

export const CharacterContactsTable = ({
  ...otherProps
}: Omit<ContactsTableProps, "contacts" | "labels">) => {
  const { data, labels } = useCharacterContacts();

  return <ContactsTable contacts={data} labels={labels} {...otherProps} />;
};
