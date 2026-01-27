import { useCorporationContacts } from "@jitaspace/hooks";

import type { ContactsDataTableProps } from "./ContactsDataTable";
import { ContactsDataTable } from "./ContactsDataTable";

export type CorporationContactsDataTableProps = Omit<
  ContactsDataTableProps,
  "contacts" | "labels"
> & {
  corporationId: number;
};

export const CorporationContactsDataTable = ({
  corporationId,
  ...otherProps
}: CorporationContactsDataTableProps) => {
  const { data, labels } = useCorporationContacts(corporationId);

  return (
    <ContactsDataTable
      contacts={data}
      labels={labels}
      hideBlockedColumn
      {...otherProps}
    />
  );
};
