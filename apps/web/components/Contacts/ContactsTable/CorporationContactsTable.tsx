import { useCorporationContacts } from "@jitaspace/hooks";

import type { ContactsTableProps } from "./ContactsTable";
import { ContactsTable } from "./ContactsTable";

export type CorporationContactsTableProps = Omit<
  ContactsTableProps,
  "contacts" | "labels"
> & {
  corporationId: number;
};

export const CorporationContactsTable = ({
  corporationId,
  ...otherProps
}: CorporationContactsTableProps) => {
  const { data, labels } = useCorporationContacts(corporationId);

  return (
    <ContactsTable
      contacts={data}
      labels={labels}
      hideBlockedColumn
      {...otherProps}
    />
  );
};
