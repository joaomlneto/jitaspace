import React from "react";
import { Group, Spoiler, Stack, Text } from "@mantine/core";

import { useCharacterMail, useCharacterMailLabels } from "@jitaspace/hooks";
import {
  EveEntityAnchor,
  EveEntityAvatar,
  EveEntityName,
  EveMailSenderAnchor,
  EveMailSenderAvatar,
  EveMailSenderName,
  FormattedDateText,
  LabelName,
  MailingListName,
  MailLabelColorSwatch,
} from "@jitaspace/ui";

import { MailboxTableProps } from "~/components/EveMail/MailboxTable";
import { MailMessageViewer } from "~/components/EveMail/MailMessageViewer";
import { MessageMenu } from "~/components/EveMail/MessageMenu";

export type MessagePanelProps = {
  characterId: number;
  data: MailboxTableProps["data"];
  messageId?: number;
  hideLabels?: boolean;
  hideMessage?: boolean;
  hideRecipients?: boolean;
  hideSender?: boolean;
  hideSubject?: boolean;
};

export function MessagePanel({
  characterId,
  data,
  messageId,
  hideLabels,
  hideMessage,
  hideRecipients,
  hideSender,
  hideSubject,
}: MessagePanelProps) {
  const { data: labels } = useCharacterMailLabels(characterId);
  const { data: mail } = useCharacterMail(characterId, messageId);

  return (
    <Stack>
      {!hideSender && (
        <Group position="apart">
          <Group wrap="nowrap" spacing="xs">
            From:
            <EveMailSenderAvatar
              characterId={characterId}
              messageId={messageId}
              size="sm"
            />
            <EveMailSenderAnchor
              characterId={characterId}
              messageId={messageId}
              target="_blank"
            >
              <EveMailSenderName
                characterId={characterId}
                messageId={messageId}
              />
            </EveMailSenderAnchor>
          </Group>
          {mail?.data.timestamp && (
            <Text>
              <FormattedDateText
                span
                date={new Date(mail?.data.timestamp)}
                format="yyyy-MM-dd HH:mm"
              />
            </Text>
          )}
        </Group>
      )}
      {!hideRecipients && (
        <Group align="start">
          <Spoiler
            maxHeight={38}
            hideLabel={<Text size="sm">Show less</Text>}
            showLabel={
              <Text size="sm">{`Show all ${mail?.data.recipients?.length} recipients`}</Text>
            }
          >
            <Group spacing="md" mb="xs">
              <Text>To:</Text>
              {mail?.data.recipients?.map((recipient) => (
                <Group wrap="nowrap" spacing="xs" key={recipient.recipient_id}>
                  <EveEntityAvatar
                    entityId={recipient.recipient_id}
                    size="sm"
                  />
                  {recipient.recipient_type === "mailing_list" ? (
                    <MailingListName
                      characterId={characterId}
                      mailingListId={recipient.recipient_id}
                    >
                      Mailing List
                    </MailingListName>
                  ) : (
                    <EveEntityAnchor
                      entityId={recipient.recipient_id}
                      category={recipient.recipient_type}
                      target="_blank"
                    >
                      <EveEntityName
                        category={recipient.recipient_type}
                        entityId={recipient.recipient_id}
                      />
                    </EveEntityAnchor>
                  )}
                </Group>
              ))}
            </Group>
          </Spoiler>
        </Group>
      )}
      {!hideLabels && (
        <Group position="apart">
          {mail?.data.labels?.length === 0 && (
            <Text size="md" color="dimmed">
              No labels assigned
            </Text>
          )}
          <Group align="start">
            {mail?.data.labels
              ?.map(
                (labelIndex) =>
                  labels?.data.labels?.find(
                    (label) => label.label_id === labelIndex,
                  ),
              )
              .map(
                (item) =>
                  item && (
                    <Group key={item.label_id} wrap="nowrap" spacing="xs">
                      <MailLabelColorSwatch
                        characterId={characterId}
                        labelId={item.label_id}
                        size={12}
                      />
                      <LabelName
                        characterId={characterId}
                        size="sm"
                        labelId={item.label_id}
                      />
                    </Group>
                  ),
              )}
          </Group>
          {mail?.data && (
            <Group position="right">
              <MessageMenu
                characterId={characterId}
                data={data}
                mail={mail.data}
              />
            </Group>
          )}
        </Group>
      )}
      {!hideSubject && <Text>Subject: {mail?.data.subject}</Text>}
      {!hideMessage && <MailMessageViewer content={mail?.data.body ?? ""} />}
    </Stack>
  );
}
