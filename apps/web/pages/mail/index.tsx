import React, { useEffect, type ReactElement } from "react";
import { useRouter } from "next/router";
import {
  ActionIcon,
  Alert,
  Button,
  Center,
  Container,
  Grid,
  Group,
  Loader,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { NextSeo } from "next-seo";

import { useCharacterMails } from "@jitaspace/esi-hooks";
import {
  EvemailComposeIcon,
  EveMailIcon,
  EveMailTagIcon,
  GroupListIcon,
} from "@jitaspace/eve-icons";
import { EveMailLabelMultiSelect } from "@jitaspace/ui";
import { toArrayIfNot } from "@jitaspace/utils";

import { MailboxTable } from "~/components/EveMail";
import { MainLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const labels = router.query.labels;

  const [selectedLabels, setSelectedLabels] = React.useState<string[]>([]);

  useEffect(() => {
    if (router.isReady) {
      setSelectedLabels(toArrayIfNot(labels ?? []) ?? []);
    }
  }, [router.isReady, labels]);

  const {
    messages,
    hasMoreMessages,
    loadMoreMessages,
    isLoading,
    mutate,
    error,
    isValidating,
  } = useCharacterMails({ labels: selectedLabels.map(Number) });

  return (
    <Container size="xl">
      <Stack>
        {error && (
          <Container size="xs">
            <Alert title="Error loading messages">{error}</Alert>
          </Container>
        )}
        <Group>
          <EveMailIcon width={48} />
          <Title order={1}>EveMail</Title>
        </Group>
        <Grid align="flex-end" justify="space-between">
          <Grid.Col span="content">
            <Group noWrap spacing="xs">
              <Tooltip label="Compose new message">
                <ActionIcon
                  variant="default"
                  size="lg"
                  onClick={() =>
                    modals.openContextModal({
                      modal: "composeMail",
                      title: "Compose new message",
                      size: "xl",
                      innerProps: {},
                    })
                  }
                >
                  <EvemailComposeIcon
                    alt="Compose new message"
                    width={32}
                    height={32}
                  />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="View Mailing List Subscriptions">
                <ActionIcon
                  variant="default"
                  size="lg"
                  onClick={() =>
                    modals.openContextModal({
                      modal: "viewMailingListSubscriptions",
                      title: "Active Mailing List Subscriptions",
                      size: "md",
                      innerProps: {},
                    })
                  }
                >
                  <GroupListIcon alt="Mailing Lists" width={32} height={32} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Manage Labels">
                <ActionIcon
                  variant="default"
                  size="lg"
                  onClick={() =>
                    modals.openContextModal({
                      modal: "manageMailLabels",
                      title: "Manage Labels",
                      size: "md",
                      innerProps: {},
                    })
                  }
                >
                  <EveMailTagIcon alt="Labels" width={32} height={32} />
                </ActionIcon>
              </Tooltip>
              {(isLoading || isValidating) && (
                <Tooltip label="Loading messages...">
                  <Loader size="sm" />
                </Tooltip>
              )}
            </Group>
          </Grid.Col>
          <Grid.Col span="content">
            <EveMailLabelMultiSelect
              size="xs"
              style={{ minWidth: "240px" }}
              label="Filter by label"
              value={selectedLabels}
              onChange={(value: string[]) => {
                setSelectedLabels(value);
                void router.push(
                  {
                    pathname: router.pathname,
                    query: {
                      labels: value,
                    },
                  },
                  undefined,
                  {
                    shallow: true,
                  },
                );
              }}
              defaultValue={selectedLabels}
            />
          </Grid.Col>
        </Grid>
        {messages.length > 0 && (
          <MailboxTable data={messages} mutate={() => void mutate()} />
        )}
        {hasMoreMessages && (
          <Button w="100%" onClick={loadMoreMessages}>
            Load more messages
          </Button>
        )}
        {(isLoading || isValidating) && !hasMoreMessages && (
          <Group noWrap>
            <Loader size="sm" />
            <Text>Loading messages</Text>
          </Group>
        )}
        {!isLoading && !isValidating && !hasMoreMessages && (
          <Center>
            <Text color="dimmed">No more messages</Text>
          </Center>
        )}
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="EveMail" />
      {page}
    </MainLayout>
  );
};

Page.requiredScopes = [
  "esi-mail.organize_mail.v1",
  "esi-mail.read_mail.v1",
  "esi-mail.send_mail.v1",
  "esi-search.search_structures.v1",
  "esi-characters.read_contacts.v1",
];
