import React from "react";
import { Badge, Group, Table, Text } from "@mantine/core";

import {
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

export type ContactsTableProps = {
  contacts?: (AllianceContact & CorporationContact & CharacterContact)[];
  labels?: (AllianceContactLabel &
    CorporationContactLabel &
    CharacterContactLabel)[];
  hideBlockedColumn?: boolean;
};

export const ContactsTable = ({
  contacts,
  labels,
  hideBlockedColumn,
}: ContactsTableProps) => {
  return (
    <Table highlightOnHover>
      <thead>
        <tr>
          <th>Name</th>
          <th>Labels</th>
          <th>Standing</th>
          {!hideBlockedColumn && <th>Blocked?</th>}
        </tr>
      </thead>
      <tbody>
        {contacts
          ?.sort((a, b) => b.standing - a.standing)
          .map((contact) => {
            return (
              <tr key={contact.contact_id}>
                <td>
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
                </td>
                <td>
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
                </td>
                <td>
                  <StandingsBadge standing={contact.standing} size="sm" />
                </td>
                {!hideBlockedColumn && (
                  <td>
                    {contact.is_blocked === undefined ? (
                      <Text c="dimmed">
                        <i>Unknown</i>
                      </Text>
                    ) : contact.is_blocked ? (
                      "Yes"
                    ) : (
                      "No"
                    )}
                  </td>
                )}
              </tr>
            );
          })}
      </tbody>
    </Table>
  );
};
