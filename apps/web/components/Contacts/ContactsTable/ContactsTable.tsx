import { Badge, Group, Table, Text } from "@mantine/core";

import type {
  AllianceContact,
  AllianceContactLabel,
  CharacterContact,
  CharacterContactLabel,
  CorporationContact,
  CorporationContactLabel,
} from "@jitaspace/hooks";
import {
  EveEntityAnchor,
  EveEntityAvatar,
  EveEntityName,
  StandingIndicator,
  StandingsBadge,
} from "@jitaspace/ui";

export interface ContactsTableProps {
  contacts?: (AllianceContact & CorporationContact & CharacterContact)[];
  labels?: (AllianceContactLabel &
    CorporationContactLabel &
    CharacterContactLabel)[];
  hideBlockedColumn?: boolean;
}

export const ContactsTable = ({
  contacts,
  labels,
  hideBlockedColumn,
}: ContactsTableProps) => {
  return (
    <Table highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <th>Name</th>
          <th>Labels</th>
          <th>Standing</th>
          {!hideBlockedColumn && <th>Blocked?</th>}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {contacts
          ?.sort((a, b) => b.standing - a.standing)
          .map((contact) => {
            return (
              <Table.Tr key={contact.contact_id}>
                <Table.Td>
                  <Group>
                    <StandingIndicator standing={contact.standing}>
                      <EveEntityAvatar
                        entityId={contact.contact_id}
                        category={contact.contact_type}
                        size="sm"
                      />
                    </StandingIndicator>
                    <EveEntityAnchor
                      entityId={contact.contact_id}
                      category={contact.contact_type}
                    >
                      <EveEntityName
                        entityId={contact.contact_id}
                        category={contact.contact_type}
                      />
                    </EveEntityAnchor>
                    {contact.is_watched && (
                      <Badge variant="filled" size="xs">
                        watched
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {contact.label_ids?.map((labelId) => (
                      <Badge size="sm" key={labelId}>
                        {
                          labels?.find((label) => label.label_id === labelId)
                            ?.label_name
                        }
                      </Badge>
                    ))}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <StandingsBadge standing={contact.standing} size="sm" />
                </Table.Td>
                {!hideBlockedColumn && (
                  <Table.Td>
                    {contact.is_blocked === undefined ? (
                      <Text c="dimmed">
                        <i>Unknown</i>
                      </Text>
                    ) : contact.is_blocked ? (
                      "Yes"
                    ) : (
                      "No"
                    )}
                  </Table.Td>
                )}
              </Table.Tr>
            );
          })}
      </Table.Tbody>
    </Table>
  );
};
