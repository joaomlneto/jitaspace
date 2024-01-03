import React, { type ReactElement } from "react";
import {
  Container,
  Group,
  JsonInput,
  Stack,
  Table,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconMail, IconMailOpened } from "@tabler/icons-react";
import { NextSeo } from "next-seo";

import { MemberIcon } from "@jitaspace/eve-icons";
import {
  useEsiCharacterNotifications,
  useSelectedCharacter,
} from "@jitaspace/hooks";
import {
  EveEntityAvatar,
  EveEntityName,
  FormattedDateText,
  TimeAgoText,
} from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

export default function Page() {
  const character = useSelectedCharacter();
  const { data } = useEsiCharacterNotifications(character?.characterId);
  return (
    <Container size="xl">
      <Stack>
        <Group>
          <MemberIcon width={48} />
          <Title>Notifications</Title>
        </Group>
        <Table highlightOnHover>
          <tbody>
            {data?.data.map((notification) => (
              <tr key={notification.notification_id}>
                <td>
                  <Group wrap="nowrap" gap="xs">
                    <EveEntityAvatar entityId={notification.sender_id} />
                    <EveEntityName entityId={notification.sender_id} />
                  </Group>
                </td>
                <td>
                  {notification.is_read ? (
                    <IconMailOpened strokeWidth={1} />
                  ) : (
                    <IconMail strokeWidth={1} />
                  )}
                </td>
                <td>{notification.type}</td>
                <td>
                  <JsonInput value={notification.text} cols={80} autosize />
                </td>
                <td>
                  <Tooltip
                    color="dark"
                    label={
                      <FormattedDateText
                        date={new Date(notification.timestamp)}
                      />
                    }
                  >
                    <div>
                      <TimeAgoText
                        date={new Date(notification.timestamp)}
                        addSuffix
                      />
                    </div>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Notifications" />
      {page}
    </MainLayout>
  );
};

Page.requiredScopes = ["esi-characters.read_notifications.v1"];
