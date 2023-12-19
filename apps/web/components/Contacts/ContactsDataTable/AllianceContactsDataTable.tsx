import React from "react";

import { useAllianceContacts } from "@jitaspace/hooks";

import {
  ContactsDataTable,
  type ContactsDataTableProps,
} from "./ContactsDataTable";


export type AllianceContactsDataTableProps = Omit<
  ContactsDataTableProps,
  "contacts" | "labels"
> & {
  allianceId: number;
};

export const AllianceContactsDataTable = ({
  allianceId,
  ...otherProps
}: AllianceContactsDataTableProps) => {
  const { data, labels } = useAllianceContacts(allianceId);

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
