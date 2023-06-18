import React from "react";
import { Group, Spoiler, Stack, Text } from "@mantine/core";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdMailLabels,
  useGetCharactersCharacterIdMailMailId,
} from "@jitaspace/esi-client";
import {
  EveEntityAvatar,
  EveEntityName,
  EveMailSenderAvatar,
  EveMailSenderName,
  LabelName,
  MailLabelColorSwatch,
} from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail/MailMessageViewer";

export function MessagePanel({ messageId }: { messageId?: number }) {
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
      <Group position="apart">
        <Group>
          From:
          <EveMailSenderAvatar messageId={messageId} size="sm" radius="xl" />
          <EveMailSenderName messageId={messageId} />
        </Group>
        {mail?.data.timestamp && (
          <Group>On {new Date(mail?.data.timestamp).toLocaleString()}</Group>
        )}
      </Group>
      <Group align="start">
        <Spoiler
          maxHeight={32}
          hideLabel="Show less"
          showLabel={`Show all ${mail?.data.recipients?.length} recipients`}
        >
          <Group>
            <Text>To:</Text>
            {mail?.data.recipients?.map((recipient) => (
              <Group noWrap key={recipient.recipient_id}>
                <EveEntityAvatar
                  entityId={recipient.recipient_id}
                  size="sm"
                  radius="xl"
                />
                {recipient.recipient_type === "mailing_list" ? (
                  <Text>Mailing List</Text>
                ) : (
                  <EveEntityName
                    category={recipient.recipient_type}
                    entityId={recipient.recipient_id}
                  />
                )}
              </Group>
            ))}
          </Group>
        </Spoiler>
      </Group>
      <Group position="apart">
        <Group align="start">Subject: {mail?.data.subject}</Group>
        {mail?.data.labels && (
          <Group align="start">
            {mail.data.labels
              ?.map((labelIndex) =>
                labels?.data.labels?.find(
                  (label) => label.label_id === labelIndex,
                ),
              )
              .map(
                (item) =>
                  item && (
                    <Group key={item.label_id} noWrap spacing="xs">
                      <MailLabelColorSwatch labelId={item.label_id} size={16} />
                      <LabelName labelId={item.label_id} />
                    </Group>
                  ),
              )}
          </Group>
        )}
      </Group>
      <MailMessageViewer content={mail?.data.body ?? ""} />
    </Stack>
  );
}
