import { Stack, Table, Tooltip, UnstyledButton } from "@mantine/core";

const scopeDetails: Record<string, { name: string; description: string }> = {
  "esi-mail.read_mail.v1": {
    name: "Read Mail",
    description:
      "Allows you to get the list of labels, to retrieve the contents of each mailbox, to read the contents of messages, and to retrieve the list of mailing lists.",
  },
  "esi-mail.send_mail.v1": {
    name: "Send Mail",
    description: "Allows you to send messages.",
  },
  "esi-mail.organize_mail.v1": {
    name: "Organize Mail",
    description:
      "Allows you to organize your mail, such as deleting, labeling messages and marking them as read/unread. It also allows you to create and delete labels.",
  },
  "esi-search.search_structures.v1": {
    name: "Search Structures",
    description:
      "Allows you to search for characters, corporations, alliances, etc. based on their partial name. This is required to search for recipients when composing a message.",
  },
  "esi-characters.read_contacts.v1": {
    name: "Read Contacts",
    description:
      "Allows you to read your contacts. This is required when composing a message, as it is required to compute CSPA charges, however.",
  },
};

type PermissionsTableProps = {
  scopes: (keyof typeof scopeDetails)[];
};

export default function PermissionsTable({ scopes }: PermissionsTableProps) {
  return (
    <Stack>
      <Table>
        <thead>
          <tr>
            <th>Scope</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {scopes.map((scope) => (
            <tr key={scope}>
              <td>
                <Tooltip label={scope}>
                  <UnstyledButton>{scopeDetails[scope]?.name}</UnstyledButton>
                </Tooltip>
              </td>
              <td>{scopeDetails[scope]?.description}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Stack>
  );
}
