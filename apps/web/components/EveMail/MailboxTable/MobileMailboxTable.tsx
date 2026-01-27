import { Anchor, Group, Stack, Table, Text } from "@mantine/core";
import { openContextModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";

import { useCharacterMailLabels } from "@jitaspace/hooks";
import {
  EveMailSenderAnchor,
  EveMailSenderAvatar,
  EveMailSenderName,
  FormattedDateText,
  MailLabelColorSwatch,
} from "@jitaspace/ui";

import type { MailboxTableProps } from "~/components/EveMail";

export const MobileMailboxTable = ({
  characterId,
  data,
  mutate: _mutate,
  ...otherProps
}: MailboxTableProps) => {
  const { data: labels } = useCharacterMailLabels(characterId);

  const visibleMessages = data.filter((mail) => !mail.isDeleted);

  return (
    <Table highlightOnHover {...otherProps}>
      <Table.Tbody>
        {visibleMessages.map((message) => (
          <Table.Tr key={message.mail_id}>
            <Table.Td>
              <Stack gap="xs">
                <Group justify="space-between" gap="xs">
                  <Group wrap="nowrap" gap="xs">
                    <EveMailSenderAvatar
                      characterId={characterId}
                      messageId={message.mail_id}
                      size="xs"
                    />
                    <EveMailSenderAnchor
                      characterId={characterId}
                      messageId={message.mail_id}
                      size="sm"
                    >
                      <EveMailSenderName
                        characterId={characterId}
                        messageId={message.mail_id}
                        fw={message.is_read ? "normal" : "bold"}
                      />
                    </EveMailSenderAnchor>
                  </Group>
                  <Group gap="xs" justify="space-between">
                    {message.labels
                      ?.map((labelIndex) =>
                        labels?.data.labels?.find(
                          (label) => label.label_id === labelIndex,
                        ),
                      )
                      .map(
                        (item) =>
                          item && (
                            <Group wrap="nowrap" gap="xl" key={item.label_id}>
                              <MailLabelColorSwatch
                                characterId={characterId}
                                labelId={item.label_id}
                                size={10}
                                key={item.label_id}
                              />
                            </Group>
                          ),
                      )}
                    {message.timestamp && (
                      <FormattedDateText
                        size="sm"
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
                  size="sm"
                  onClick={() => {
                    if (!message.mail_id) {
                      showNotification({
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
                        characterId,
                        messageId: message.mail_id,
                        data: data,
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
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
};
