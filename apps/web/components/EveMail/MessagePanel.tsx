import React from "react";
import { Group, Spoiler, Stack, Text } from "@mantine/core";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdMailLabels,
  useGetCharactersCharacterIdMailMailId,
} from "@jitaspace/esi-client";
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

import { MailMessageViewer } from "~/components/EveMail/MailMessageViewer";
import { MessageMenu } from "~/components/EveMail/MessageMenu";

export type MessagePanelProps = {
  messageId?: number;
  hideLabels?: boolean;
  hideMessage?: boolean;
  hideRecipients?: boolean;
  hideSender?: boolean;
  hideSubject?: boolean;
};

export function MessagePanel({
  messageId,
  hideLabels,
  hideMessage,
  hideRecipients,
  hideSender,
  hideSubject,
}: MessagePanelProps) {
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

  const { data: mail } = useGetCharactersCharacterIdMailMailId(
    characterId ?? 0,
    messageId ?? 0,
    undefined,
    {
      swr: {
        enabled: isTokenValid && !!messageId,
      },
    },
  );

  return (
    <Stack>
      {!hideSender && (
        <Group position="apart">
          <Group noWrap spacing="xs">
            From:
            <EveMailSenderAvatar messageId={messageId} size="sm" />
            <EveMailSenderAnchor messageId={messageId} target="_blank">
              <EveMailSenderName messageId={messageId} />
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
                <Group noWrap spacing="xs" key={recipient.recipient_id}>
                  <EveEntityAvatar
                    entityId={recipient.recipient_id}
                    size="sm"
                  />
                  {recipient.recipient_type === "mailing_list" ? (
                    <MailingListName mailingListId={recipient.recipient_id}>
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
              ?.map((labelIndex) =>
                labels?.data.labels?.find(
                  (label) => label.label_id === labelIndex,
                ),
              )
              .map(
                (item) =>
                  item && (
                    <Group key={item.label_id} noWrap spacing="xs">
                      <MailLabelColorSwatch labelId={item.label_id} size={12} />
                      <LabelName size="sm" labelId={item.label_id} />
                    </Group>
                  ),
              )}
          </Group>
          {mail?.data && (
            <Group position="right">
              <MessageMenu mail={mail.data} />
            </Group>
          )}
        </Group>
      )}
      {!hideSubject && <Text>Subject: {mail?.data.subject}</Text>}
      {!hideMessage && <MailMessageViewer content={mail?.data.body ?? ""} />}
    </Stack>
  );
}
