import React from "react";

import { useAllianceContacts } from "@jitaspace/hooks";

import {
  ContactsDataTable,
  type ContactsDataTableProps,
} from "./ContactsDataTable";


export const AllianceContactsDataTable = ({
  ...otherProps
}: Omit<ContactsDataTableProps, "contacts" | "labels">) => {
  const { data, labels } = useAllianceContacts();

  return (
    <ContactsDataTable
      contacts={data}
      labels={labels}
      hideBlockedColumn
      hideWatchedColumn
      {...otherProps}
    />
  );
};
