import { useCharacterContacts } from "@jitaspace/hooks";

import type { ContactsTableProps } from "./ContactsTable";
import { ContactsTable } from "./ContactsTable";

export type CharacterContactsTableProps = Omit<
  ContactsTableProps,
  "contacts" | "labels"
> & {
  characterId: number;
};

export const CharacterContactsTable = ({
  characterId,
  ...otherProps
}: CharacterContactsTableProps) => {
  const { data, labels } = useCharacterContacts(characterId);

  return <ContactsTable contacts={data} labels={labels} {...otherProps} />;
};
