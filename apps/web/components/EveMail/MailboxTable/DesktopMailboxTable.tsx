import React from "react";
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

import { type MailboxTableProps } from "~/components/EveMail";
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
                      >
                        <EveMailSenderName
                          characterId={characterId}
                          messageId={mail.mail_id}
                        />{" "}
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
              </td>
              <td>
                {mail.timestamp && (
                  <FormattedDateText
                    size="xs"
                    style={{ whiteSpace: "nowrap" }}
                    date={new Date(mail.timestamp)}
                    fw={mail.is_read ? "normal" : "bold"}
                    format="yyyy-MM-dd HH:mm"
                  />
                )}
              </td>
              <td>
                <Group gap="xs">
                  {mail.labels
                    ?.map(
                      (labelIndex) =>
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
              </td>
              <td>
                <Group justify="flex-end">
                  <MessageMenu
                    characterId={characterId}
                    data={data}
                    mail={mail}
                    mutate={mutate}
                  />
                </Group>
              </td>
            </tr>
          ))}
      </tbody>
    </Table>
  );
};
