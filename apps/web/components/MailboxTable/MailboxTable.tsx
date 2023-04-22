import React from "react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Group,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { openModal } from "@mantine/modals";
import { IconMail, IconMailOpened } from "@tabler/icons-react";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { EveMailSenderAvatar } from "@jitaspace/ui";

import { MessagePanel } from "../MessagePanel";
import { EveMailSenderNameText } from "../Text";

type Props = {
  data: {
    from?: number;
    is_read?: boolean;
    labels?: number[];
    mail_id?: number;
    recipients?: {
      recipient_id: number;
      recipient_type: string;
    }[];
    subject?: string;
    timestamp?: string;
  }[];
};

export default function MailboxTable({ data }: Props) {
  const { data: session } = useSession();
  const { data: labels } = useGetCharactersCharacterIdMailLabels(
    session?.user?.id ?? 1,
    undefined,
    {
      swr: {
        enabled: !!session?.user?.id,
      },
    },
  );
  return (
    <Table highlightOnHover striped>
      <thead>
        <tr>
          <th>
            <Text align="center">Status</Text>
          </th>
          <th>Sender</th>
          <th>Subject</th>
          <th>Received</th>
          <th>Labels</th>
        </tr>
      </thead>
      <tbody>
        {data?.map((mail) => (
          <tr key={mail.mail_id}>
            <td align="center">
              <Tooltip label={`Mark as ${mail.is_read ? "Read" : "Unread"}`}>
                <ActionIcon>
                  {mail.is_read ? (
                    <IconMailOpened size={18} color="grey" />
                  ) : (
                    <IconMail size={18} color="white" />
                  )}
                </ActionIcon>
              </Tooltip>
            </td>
            <td>
              <Group noWrap>
                <EveMailSenderAvatar
                  id={mail.from}
                  recipients={mail.recipients}
                  size="sm"
                  radius="xl"
                />
                <EveMailSenderNameText
                  recipients={mail.recipients}
                  id={mail.from}
                  fw={mail.is_read ? "normal" : "bold"}
                />
              </Group>
            </td>
            <td>
              <Anchor
                onClick={() =>
                  openModal({
                    title: mail.subject,
                    size: "xl",
                    children: <MessagePanel messageId={mail.mail_id} />,
                  })
                }
                fw={mail.is_read ? "normal" : "bold"}
              >
                {mail.subject}
              </Anchor>
            </td>
            <td>{mail.timestamp}</td>
            <td>
              <Group spacing="xs">
                {mail.labels
                  ?.map((labelIndex) =>
                    labels?.data.labels?.find(
                      (label) => label.label_id === labelIndex,
                    ),
                  )
                  .map(
                    (item) =>
                      item && (
                        <Badge
                          style={{ backgroundColor: item.color }}
                          key={item.label_id}
                          variant="outline"
                        >
                          {item.name}
                        </Badge>
                      ),
                  )}
              </Group>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
