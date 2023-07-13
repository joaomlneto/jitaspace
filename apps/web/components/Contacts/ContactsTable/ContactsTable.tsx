import React from "react";
import { Badge, Group, Table, Text } from "@mantine/core";

import {
  type GetAlliancesAllianceIdContacts200Item,
  type GetAlliancesAllianceIdContactsLabels200Item,
  type GetCharactersCharacterIdContacts200Item,
  type GetCharactersCharacterIdContactsLabels200Item,
  type GetCorporationsCorporationIdContacts200Item,
  type GetCorporationsCorporationIdContactsLabels200Item,
} from "../../../../../packages/esi-client";
import {
  EveEntityAnchor,
  EveEntityAvatar,
  EveEntityName,
  StandingIndicator,
  StandingsBadge,
} from "../../../../../packages/ui";

export type ContactsTableProps = {
  contacts?: (GetCharactersCharacterIdContacts200Item &
    GetCorporationsCorporationIdContacts200Item &
    GetAlliancesAllianceIdContacts200Item)[];
  labels?: (GetCharactersCharacterIdContactsLabels200Item &
    GetCorporationsCorporationIdContactsLabels200Item &
    GetAlliancesAllianceIdContactsLabels200Item)[];
};

export const ContactsTable = ({ contacts, labels }: ContactsTableProps) => {
  return (
    <Table highlightOnHover>
      <thead>
        <tr>
          <th>Name</th>
          <th>Labels</th>
          <th>Standing</th>
          <th>Blocked?</th>
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
                  <Group spacing="xs">
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
                <td>
                  {contact.is_blocked === undefined ? (
                    <Text color="dimmed">
                      <i>Unknown</i>
                    </Text>
                  ) : contact.is_blocked ? (
                    "Yes"
                  ) : (
                    "No"
                  )}
                </td>
              </tr>
            );
          })}
      </tbody>
    </Table>
  );
};
