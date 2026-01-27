import { useAllianceContacts } from "@jitaspace/hooks";

import type { ContactsTableProps } from "./ContactsTable";
import { ContactsTable } from "./ContactsTable";

export type AllianceContactsTableProps = Omit<
  ContactsTableProps,
  "contacts" | "labels"
> & {
  allianceId: number;
};

export const AllianceContactsTable = ({
  allianceId,
  ...otherProps
}: AllianceContactsTableProps) => {
  const { data, labels } = useAllianceContacts(allianceId);

  return (
    <ContactsTable
      contacts={data}
      labels={labels}
      hideBlockedColumn
      {...otherProps}
    />
  );
};
