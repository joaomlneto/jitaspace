import React from "react";

import { useCharacterContacts } from "@jitaspace/hooks";

import {
  ContactsDataTable,
  type ContactsDataTableProps,
} from "./ContactsDataTable";


export const CharacterContactsDataTable = ({
  ...otherProps
}: Omit<ContactsDataTableProps, "contacts" | "labels">) => {
  const { data, labels } = useCharacterContacts();

  return <ContactsDataTable contacts={data} labels={labels} {...otherProps} />;
};
