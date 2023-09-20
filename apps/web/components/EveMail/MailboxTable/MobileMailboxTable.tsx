import React from "react";
import { Anchor, Group, Stack, Table, Text } from "@mantine/core";
import { openContextModal } from "@mantine/modals";
import { notifications } from "@mantine/notifications";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";
import {
  EveMailSenderAnchor,
  EveMailSenderAvatar,
  EveMailSenderName,
  FormattedDateText,
  MailLabelColorSwatch,
} from "@jitaspace/ui";

import { type MailboxTableProps } from "~/components/EveMail";

export const MobileMailboxTable = ({
  data,
  ...otherProps
}: MailboxTableProps) => {
  const { characterId, isTokenValid } = useEsiClientContext();
  const { data: labels } = useGetCharactersCharacterIdMailLabels(
    characterId ?? 1,
    undefined,
    {
      swr: {
        enabled: isTokenValid,
      },
    },
  );

  const visibleMessages = data.filter((mail) => !mail.isDeleted);

  return (
    <Table highlightOnHover {...otherProps}>
      <tbody>
        {visibleMessages.map((message) => (
          <tr key={message.mail_id}>
            <td>
              <Stack gap="xs">
                <Group justify="apart" gap="xs">
                  <Group wrap="nowrap" gap="xs">
                    <EveMailSenderAvatar
                      messageId={message.mail_id}
                      size="xs"
                    />
                    <EveMailSenderAnchor messageId={message.mail_id}>
                      <EveMailSenderName
                        messageId={message.mail_id}
                        fw={message.is_read ? "normal" : "bold"}
                      />
                    </EveMailSenderAnchor>
                  </Group>
                  <Group gap="xs" justify="apart">
                    {message.labels
                      ?.map(
                        (labelIndex) =>
                          labels?.data.labels?.find(
                            (label) => label.label_id === labelIndex,
                          ),
                      )
                      .map(
                        (item) =>
                          item && (
                            <Group wrap="nowrap" gap="xl" key={item.label_id}>
                              <MailLabelColorSwatch
                                labelId={item.label_id}
                                size={10}
                                key={item.label_id}
                              />
                            </Group>
                          ),
                      )}
                    {message.timestamp && (
                      <FormattedDateText
                        date={
                          message.timestamp
                            ? new Date(message.timestamp)
                            : undefined
                        }
                        format="LLL dd"
                        fw={message.is_read ? "normal" : "bold"}
                      />
                    )}
                  </Group>
                </Group>
                <Anchor
                  onClick={() => {
                    if (!message.mail_id) {
                      notifications.show({
                        title: "Error",
                        message: "Mail ID is not defined for this mail!?",
                      });
                      return;
                    }
                    openContextModal({
                      modal: "viewMailMessage",
                      title: <Text fw={700}>{message.subject}</Text>,
                      size: "xl",
                      innerProps: {
                        messageId: message.mail_id,
                        hideSubject: true,
                      },
                    });
                  }}
                  fw={message.is_read ? "normal" : "bold"}
                  lineClamp={1}
                >
                  {message.subject !== undefined &&
                    (message.subject.length > 0 ? (
                      message.subject
                    ) : (
                      <Anchor fs="italic" fw={150} component="span">
                        (No Subject)
                      </Anchor>
                    ))}
                </Anchor>
              </Stack>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};
