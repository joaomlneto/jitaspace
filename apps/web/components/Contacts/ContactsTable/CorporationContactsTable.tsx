import React from "react";

import { useCorporationContacts } from "@jitaspace/esi-client";

import { ContactsTable, type ContactsTableProps } from "./ContactsTable";

export const CorporationContactsTable = ({
  ...otherProps
}: Omit<ContactsTableProps, "contacts" | "labels">) => {
  const { data, labels } = useCorporationContacts();

  return (
    <ContactsTable
      contacts={data}
      labels={labels}
      hideBlockedColumn
      {...otherProps}
    />
  );
};
