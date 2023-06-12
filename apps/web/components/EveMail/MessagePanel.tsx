import React from "react";
import { Container, Group, Spoiler, Stack, Text } from "@mantine/core";
import { useSession } from "next-auth/react";
import ReactHtmlParser, { convertNodeToElement } from "react-html-parser";

import {
  useGetCharactersCharacterIdMailLabels,
  useGetCharactersCharacterIdMailMailId,
} from "@jitaspace/esi-client";
import {
  EveEntityName,
  EveMailRecipientAvatar,
  EveMailSenderAvatar,
  EveMailSenderName,
  LabelName,
  MailLabelColorSwatch,
} from "@jitaspace/ui";

function transformMailBody(
  node: {
    type: string;
    name?: string;
    attribs?: Record<string, string>;
    children: never[];
  },
  index: number,
) {
  if (node.type === "tag" && node.name === "font") {
    if (node.attribs?.size) {
      node.attribs.size = "";
    }
    return convertNodeToElement(node, index, transformMailBody);
  }
}

export function MessagePanel({ messageId }: { messageId?: number }) {
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

  const { data: mail } = useGetCharactersCharacterIdMailMailId(
    session?.user.id ?? 0,
    messageId ?? 0,
    undefined,
    {
      swr: {
        enabled: !!session?.user.id && !!messageId,
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
                <EveMailRecipientAvatar
                  messageId={messageId}
                  recipientId={recipient.recipient_id}
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
      <Container>
        {ReactHtmlParser(mail?.data.body ?? "", {
          transform: transformMailBody,
        })}
      </Container>
    </Stack>
  );
}
