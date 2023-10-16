import React from "react";

import { useAllianceContacts } from "@jitaspace/hooks";

import { ContactsTable, type ContactsTableProps } from "./ContactsTable";

export const AllianceContactsTable = ({
  ...otherProps
}: Omit<ContactsTableProps, "contacts" | "labels">) => {
  const { data, labels } = useAllianceContacts();

  return (
    <ContactsTable
      contacts={data}
      labels={labels}
      hideBlockedColumn
      {...otherProps}
    />
  );
};
