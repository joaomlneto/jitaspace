import { Anchor, Group, Popover, Table, Text } from "@mantine/core";
import { openContextModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";

import { useCharacterMailLabels } from "@jitaspace/hooks";
import {
  EveMailSenderAnchor,
  EveMailSenderAvatar,
  EveMailSenderCard,
  EveMailSenderName,
  FormattedDateText,
  LabelName,
  MailLabelColorSwatch,
} from "@jitaspace/ui";

import type { MailboxTableProps } from "~/components/EveMail";
import { MessageMenu } from "../MessageMenu";

export const DesktopMailboxTable = ({
  characterId,
  data,
  mutate,
  ...otherProps
}: MailboxTableProps) => {
  const { data: labels } = useCharacterMailLabels(characterId);
  return (
    <Table highlightOnHover {...otherProps}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Sender</Table.Th>
          <Table.Th>Subject</Table.Th>
          <Table.Th>Received</Table.Th>
          <Table.Th>Labels</Table.Th>
          <Table.Th></Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {data
          .filter((mail) => !mail.isDeleted)
          .map((mail) => (
            <Table.Tr key={mail.mail_id}>
              <Table.Td>
                <Popover width={250} withArrow shadow="md">
                  <Popover.Target>
                    <Group wrap="nowrap" key={mail.mail_id}>
                      <EveMailSenderAvatar
                        characterId={characterId}
                        messageId={mail.mail_id}
                        size="sm"
                      />
                      <EveMailSenderAnchor
                        characterId={characterId}
                        messageId={mail.mail_id}
                        fw={mail.is_read ? "normal" : "bold"}
                        size="sm"
                      >
                        <EveMailSenderName
                          characterId={characterId}
                          messageId={mail.mail_id}
                        />
                      </EveMailSenderAnchor>
                    </Group>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <EveMailSenderCard
                      characterId={characterId}
                      messageId={mail.mail_id}
                    />
                  </Popover.Dropdown>
                </Popover>
              </Table.Td>
              <Table.Td>
                <Anchor
                  size="sm"
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
                      title: <Text fw={700}>{mail.subject}</Text>,
                      size: "xl",
                      innerProps: {
                        characterId,
                        messageId: mail.mail_id,
                        data: data,
                        hideSubject: true,
                      },
                    });
                  }}
                  fw={mail.is_read ? "normal" : "bold"}
                  lineClamp={1}
                >
                  {mail.subject !== undefined &&
                    (mail.subject.length > 0 ? (
                      mail.subject
                    ) : (
                      <Anchor fs="italic" fw={150} component="span">
                        (No Subject)
                      </Anchor>
                    ))}
                </Anchor>
              </Table.Td>
              <Table.Td>
                {mail.timestamp && (
                  <FormattedDateText
                    size="xs"
                    style={{ whiteSpace: "nowrap" }}
                    date={new Date(mail.timestamp)}
                    fw={mail.is_read ? "normal" : "bold"}
                    format="yyyy-MM-dd HH:mm"
                  />
                )}
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  {mail.labels
                    ?.map((labelIndex) =>
                      labels?.data.labels?.find(
                        (label) => label.label_id === labelIndex,
                      ),
                    )
                    .map(
                      (item) =>
                        item && (
                          <Group wrap="nowrap" gap={4} key={item.label_id}>
                            <MailLabelColorSwatch
                              characterId={characterId}
                              labelId={item.label_id}
                              size={12}
                            />
                            <LabelName
                              characterId={characterId}
                              size="xs"
                              labelId={item.label_id}
                            />
                          </Group>
                        ),
                    )}
                </Group>
              </Table.Td>
              <Table.Td>
                <Group justify="flex-end">
                  <MessageMenu
                    characterId={characterId}
                    data={data}
                    mail={mail}
                    mutate={mutate}
                  />
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
      </Table.Tbody>
    </Table>
  );
};
