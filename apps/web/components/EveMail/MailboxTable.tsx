import React from "react";
import { Anchor, Group, Popover, Table, Text } from "@mantine/core";
import { openContextModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import {
  EveMailSenderAvatar,
  EveMailSenderCard,
  EveMailSenderNameAnchor,
  LabelName,
  MailLabelColorSwatch,
} from "@jitaspace/ui";

import { MessageMenu } from "~/components/EveMail/index";

type MailboxTableProps = {
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
    // This is a custom property that we add to the data
    // to indicate whether the mail has been deleted or not.
    // This is to try and be more responsive to the user, since the API
    // takes up to 30 seconds to actually show changes.
    isDeleted?: boolean;
  }[];
  mutate?: () => void;
  className?: string;
};

export function MailboxTable({ data, mutate, className }: MailboxTableProps) {
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
    <Table highlightOnHover striped className={className}>
      <thead>
        <tr>
          <th>Sender</th>
          <th>Subject</th>
          <th>Received</th>
          <th>Labels</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {data
          .filter((mail) => !mail.isDeleted)
          .map((mail) => (
            <tr key={mail.mail_id}>
              <td>
                <Popover width={250} withArrow shadow="md">
                  <Popover.Target>
                    <Group noWrap key={mail.mail_id}>
                      <EveMailSenderAvatar
                        messageId={mail.mail_id}
                        size="sm"
                        radius="xl"
                      />
                      <EveMailSenderNameAnchor
                        messageId={mail.mail_id}
                        fw={mail.is_read ? "normal" : "bold"}
                      />
                    </Group>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <EveMailSenderCard messageId={mail.mail_id} />
                  </Popover.Dropdown>
                </Popover>
              </td>
              <td>
                <Anchor
                  onClick={() => {
                    if (!mail.mail_id) {
                      showNotification({
                        title: "Error",
                        message: "Mail ID is not defined for this mail!?",
                      });
                      return;
                    }
                    openContextModal({
                      modal: "viewMailMessage",
                      title: mail.subject,
                      size: "xl",
                      innerProps: { messageId: mail.mail_id },
                    });
                  }}
                  fw={mail.is_read ? "normal" : "bold"}
                >
                  {mail.subject !== undefined &&
                    (mail.subject.length > 0 ? (
                      mail.subject
                    ) : (
                      <Anchor fs="italic" fw={150} span>
                        (No Subject)
                      </Anchor>
                    ))}
                </Anchor>
              </td>
              <td>
                {mail.timestamp && (
                  <Text fw={mail.is_read ? "normal" : "bold"}>
                    {format(new Date(mail.timestamp), "yyyy-MM-dd HH:mm")}
                  </Text>
                )}
              </td>
              <td>
                <Group spacing="xl">
                  {mail.labels
                    ?.map((labelIndex) =>
                      labels?.data.labels?.find(
                        (label) => label.label_id === labelIndex,
                      ),
                    )
                    .map(
                      (item) =>
                        item && (
                          <Group noWrap spacing="xs" key={item.label_id}>
                            <MailLabelColorSwatch
                              labelId={item.label_id}
                              size={16}
                            />
                            <LabelName labelId={item.label_id} />
                          </Group>
                        ),
                    )}
                </Group>
              </td>
              <td>
                <Group position="right">
                  <MessageMenu data={data} mail={mail} mutate={mutate} />
                </Group>
              </td>
            </tr>
          ))}
      </tbody>
    </Table>
  );
}