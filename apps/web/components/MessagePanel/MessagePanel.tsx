import React from "react";
import { Badge, Container, Group, Spoiler, Stack, Text } from "@mantine/core";
import { useSession } from "next-auth/react";
import ReactHtmlParser, { convertNodeToElement } from "react-html-parser";

import {
  useGetCharactersCharacterIdMailLabels,
  useGetCharactersCharacterIdMailMailId,
} from "~/esi/mail";
import { EveMailSenderAvatar } from "../Avatar";
import { EveMailSenderNameText } from "../Text";

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

export default function MessagePanel({ messageId }: { messageId?: number }) {
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
      <Group>ID: {messageId}</Group>
      <Group>
        From:
        <EveMailSenderAvatar
          id={mail?.data.from}
          recipients={mail?.data.recipients}
          size="sm"
          radius="xl"
        />
        <EveMailSenderNameText
          recipients={mail?.data.recipients}
          id={mail?.data.from}
        />
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
                <EveMailSenderAvatar
                  id={recipient.recipient_id}
                  recipients={mail?.data.recipients}
                  size="sm"
                  radius="xl"
                />
                <EveMailSenderNameText
                  recipients={mail?.data.recipients}
                  id={recipient.recipient_id}
                />
              </Group>
            ))}
          </Group>
        </Spoiler>
      </Group>
      {mail?.data.timestamp && (
        <Group align="start">
          Date: {new Date(mail?.data.timestamp).toLocaleString()}
        </Group>
      )}
      <Group align="start">Subject: {mail?.data.subject}</Group>
      {mail?.data.labels && (
        <Group align="start">
          Labels:{" "}
          {mail.data.labels
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
      )}
      <Container>
        {ReactHtmlParser(mail?.data.body ?? "", {
          transform: transformMailBody,
        })}
      </Container>
    </Stack>
  );
}
