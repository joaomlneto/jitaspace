import React from "react";

import { useCorporationContacts } from "@jitaspace/hooks";

import {
  ContactsDataTable,
  type ContactsDataTableProps,
} from "./ContactsDataTable";


export const CorporationContactsDataTable = ({
  ...otherProps
}: Omit<ContactsDataTableProps, "contacts" | "labels">) => {
  const { data, labels } = useCorporationContacts();

  return (
    <ContactsDataTable
      contacts={data}
      labels={labels}
      hideBlockedColumn
      {...otherProps}
    />
  );
};
